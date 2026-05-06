import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from './enums/roles.enum';
import { MailService } from '../mail/mail.service';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
/**
 * Servico responsavel pela logica de Auth.
 */

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Autentica um utilizador e devolve os dados da sessao.
   * @param loginDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async login(loginDto: LoginDto) {
    const user = await this.obterUtilizadorPorUsername(loginDto.username);

    if (!user)
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');

    const passwordValida = await bcrypt.compare(
      loginDto.password,
      user.Password,
    );

    if (!passwordValida)
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');

    if (!user.Ativo)
      throw new UnauthorizedException(
        'A sua conta está inativa. Contacte a coordenação.',
      );

    const userRoles = this.determinarRoles(user);
    const userRole = this.determinarRolePadrao(userRoles);
    const payload = this.criarPayloadSessao(user, userRole, userRoles);

    return {
      access_token: await this.jwtService.signAsync(payload),
      role: userRole,
      roles: userRoles,
    };
  }

  /**
   * Troca a role ativa mantendo a sessao autenticada.
   * @param utilizador Dados do utilizador autenticado.
   * @param role Role a ativar.
   * @returns Novo token com a role selecionada.
   */

  async trocarRole(utilizador: UtilizadorAutenticado, role: Role) {
    const user = await this.obterUtilizadorPorId(utilizador.sub);

    if (!user || !user.Ativo) {
      throw new UnauthorizedException('SessÃ£o invÃ¡lida.');
    }

    const userRoles = this.determinarRoles(user);

    if (!userRoles.includes(role)) {
      throw new UnauthorizedException(
        'A role selecionada nÃ£o estÃ¡ associada ao utilizador.',
      );
    }

    const payload = this.criarPayloadSessao(user, role, userRoles);

    return {
      access_token: await this.jwtService.signAsync(payload),
      role,
      roles: userRoles,
    };
  }

  /**
   * Atualiza o token com os perfis atuais do utilizador.
   * @param utilizador Dados do utilizador autenticado.
   * @returns Novo token da sessao.
   */

  async atualizarSessao(utilizador: UtilizadorAutenticado) {
    const user = await this.obterUtilizadorPorId(utilizador.sub);

    if (!user || !user.Ativo) {
      throw new UnauthorizedException('SessÃ£o invÃ¡lida.');
    }

    const userRoles = this.determinarRoles(user);
    const roleAtiva = userRoles.includes(utilizador.role)
      ? utilizador.role
      : this.determinarRolePadrao(userRoles);
    const payload = this.criarPayloadSessao(user, roleAtiva, userRoles);

    return {
      access_token: await this.jwtService.signAsync(payload),
      role: roleAtiva,
      roles: userRoles,
    };
  }

  /**
   * Inicia o fluxo de recuperacao de password.
   * @param forgotPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();

    const user = await this.prisma.utilizador.findFirst({
      where: { Pessoa: { Email: { equals: email } } },
      include: { Pessoa: true },
    });

    const respostaGenerica = {
      message:
        'Se existir uma conta associada a esse email, receberá instruções para repor a password.',
    };

    if (!user || !user.Ativo) return respostaGenerica;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.utilizador.update({
      where: { ID_Utilizador: user.ID_Utilizador },
      data: {
        ResetPasswordToken: tokenHash,
        ResetPasswordTokenExpiresAt: expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/login?resetToken=${token}`;

    await this.mailService.sendPasswordResetEmail(user.Pessoa.Email, resetLink);

    return respostaGenerica;
  }

  /**
   * Conclui o fluxo de redefinicao de password.
   * @param resetPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(resetPasswordDto.token);

    const user = await this.prisma.utilizador.findFirst({
      where: {
        ResetPasswordToken: tokenHash,
        ResetPasswordTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user)
      throw new BadRequestException(
        'O link de recuperação é inválido ou já expirou.',
      );

    const passwordHash = await bcrypt.hash(resetPasswordDto.password, 10);

    await this.prisma.utilizador.update({
      where: { ID_Utilizador: user.ID_Utilizador },
      data: {
        Password: passwordHash,
        ResetPasswordToken: null,
        ResetPasswordTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password alterada com sucesso. Já pode iniciar sessão.',
    };
  }

  /**
   * Executa a operacao hash reset token.
   * @param token Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Executa a operacao obter utilizador por username.
   * @param username Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterUtilizadorPorUsername(username: string) {
    return this.prisma.utilizador.findUnique({
      where: { Utilizador: username },
      include: this.includePerfisUtilizador(),
    });
  }

  private async obterUtilizadorPorId(idUtilizador: number) {
    return this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: this.includePerfisUtilizador(),
    });
  }

  private includePerfisUtilizador() {
    return {
      Pessoa: {
        include: {
          Professor: true,
          Coordenador: true,
          Enc_Educacao: true,
        },
      },
    };
  }

  private criarPayloadSessao(user: any, role: Role, roles: Role[]) {
    return {
      sub: user.ID_Utilizador,
      username: user.Utilizador,
      nome: user.Pessoa?.Nome,
      role,
      roles,
      idPessoa: user.ID_Pessoa,
      Acoes_Rapidas: user.Acoes_Rapidas,
    };
  }

  private determinarRoles(user: any): Role[] {
    const roles: Role[] = [];

    if (user.Pessoa?.Professor) roles.push(Role.PROFESSOR);
    if (user.Pessoa?.Coordenador) roles.push(Role.COORDENADOR);
    if (user.Pessoa?.Enc_Educacao) roles.push(Role.ENC_EDUCACAO);

    if (roles.length === 0) {
      throw new UnauthorizedException('Utilizador sem perfil vÃ¡lido.');
    }

    return roles;
  }

  private determinarRolePadrao(roles: Role[]): Role {
    return roles[0];
  }

  /**
   * Executa a operacao determinar role.
   * @param user Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private determinarRole(user: any): Role {
    if (user.Pessoa?.Professor) return Role.PROFESSOR;
    if (user.Pessoa?.Coordenador) return Role.COORDENADOR;
    if (user.Pessoa?.Enc_Educacao) return Role.ENC_EDUCACAO;
    throw new UnauthorizedException('Utilizador sem perfil válido.');
  }
}
