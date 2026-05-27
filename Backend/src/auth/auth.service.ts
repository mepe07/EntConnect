import {
  BadRequestException,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);

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

    if (!user) {
      this.logger.warn(
        `Login falhou: utilizador inexistente usernameHash=${this.hashAuditValue(loginDto.username)}`,
      );
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');
    }

    const passwordValida = await bcrypt.compare(
      loginDto.password,
      user.Password,
    );

    if (!passwordValida) {
      this.logger.warn(
        `Login falhou: password invalida userId=${user.ID_Utilizador}`,
      );
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');
    }

    if (!user.Ativo) {
      this.logger.warn(
        `Login bloqueado: conta inativa userId=${user.ID_Utilizador}`,
      );
      throw new UnauthorizedException(
        'A sua conta está inativa. Contacte a coordenação.',
      );
    }

    const userRoles = this.determinarRoles(user);
    const userRole = this.determinarRoleLogin(userRoles, loginDto.rolePreferida);
    const payload = this.criarPayloadSessao(user, userRole, userRoles);

    this.logger.log(
      `Login efetuado com sucesso userId=${user.ID_Utilizador} role=${userRole} roles=${userRoles.join(',')}`,
    );

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
      this.logger.warn(
        `Troca de role rejeitada: sessao invalida userId=${utilizador.sub}`,
      );
      throw new UnauthorizedException('SessÃ£o invÃ¡lida.');
    }

    const userRoles = this.determinarRoles(user);

    if (!userRoles.includes(role)) {
      this.logger.warn(
        `Troca de role rejeitada: role sem permissao userId=${user.ID_Utilizador} role=${role}`,
      );
      throw new UnauthorizedException(
        'A role selecionada não estão associada ao utilizador.',
      );
    }

    const payload = this.criarPayloadSessao(user, role, userRoles);

    this.logger.log(
      `Role ativa alterada userId=${user.ID_Utilizador} role=${role}`,
    );

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
      this.logger.warn(
        `Atualizacao de sessao rejeitada userId=${utilizador.sub}`,
      );
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
    const emailHash = this.hashAuditValue(email);

    const user = await this.prisma.utilizador.findFirst({
      where: { Pessoa: { Email: { equals: email } } },
      include: { Pessoa: true },
    });

    const respostaGenerica = {
      message:
        'Se existir uma conta associada a esse email, receberá instruções para repor a password.',
    };

    if (!user || !user.Ativo) {
      this.logger.warn(
        `Recuperacao de password ignorada emailHash=${emailHash} motivo=${!user ? 'utilizador-inexistente' : 'utilizador-inativo'}`,
      );
      return respostaGenerica;
    }

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
    this.logger.log(
      `Email de recuperacao de password enviado userId=${user.ID_Utilizador} emailHash=${emailHash}`,
    );

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

    if (!user) {
      this.logger.warn(
        'Redefinicao de password falhou: token invalido ou expirado.',
      );
      throw new BadRequestException(
        'O link de recuperação é inválido ou já expirou.',
      );
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.password, 10);

    await this.prisma.utilizador.update({
      where: { ID_Utilizador: user.ID_Utilizador },
      data: {
        Password: passwordHash,
        ResetPasswordToken: null,
        ResetPasswordTokenExpiresAt: null,
      },
    });
    this.logger.log(
      `Password redefinida com sucesso userId=${user.ID_Utilizador}`,
    );

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

  private hashAuditValue(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
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
      Quadros_Visualizacao: user.Quadros_Visualizacao,
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

  private determinarRoleLogin(roles: Role[], rolePreferida?: Role): Role {
    if (rolePreferida && roles.includes(rolePreferida)) {
      return rolePreferida;
    }

    return this.determinarRolePadrao(roles);
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
