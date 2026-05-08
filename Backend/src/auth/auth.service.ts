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
    this.logger.log(`Tentativa de login para utilizador=${loginDto.username}`);

    const user = await this.obterUtilizadorPorUsername(loginDto.username);

    if (!user) {
      this.logger.warn(
        `Login falhou: utilizador inexistente username=${loginDto.username}`,
      );
    }

    if (!user)
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');

    const passwordValida = await bcrypt.compare(
      loginDto.password,
      user.Password,
    );

    if (!passwordValida) {
      this.logger.warn(
        `Login falhou: password invalida userId=${user.ID_Utilizador} username=${user.Utilizador}`,
      );
    }

    if (!passwordValida)
      throw new UnauthorizedException('Os dados introduzidos estão inválidos.');

    if (!user.Ativo) {
      this.logger.warn(
        `Login bloqueado: conta inativa userId=${user.ID_Utilizador} username=${user.Utilizador}`,
      );
    }

    if (!user.Ativo)
      throw new UnauthorizedException(
        'A sua conta está inativa. Contacte a coordenação.',
      );

    const userRole = this.determinarRole(user);
    this.logger.log(
      `Login efetuado com sucesso userId=${user.ID_Utilizador} username=${user.Utilizador} role=${userRole}`,
    );

    const payload = {
      sub: user.ID_Utilizador,
      username: user.Utilizador,
      nome: user.Pessoa?.Nome,
      role: userRole,
      idPessoa: user.ID_Pessoa,
      Acoes_Rapidas: user.Acoes_Rapidas,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      role: userRole,
    };
  }

  /**
   * Inicia o fluxo de recuperacao de password.
   * @param forgotPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();
    this.logger.log(
      `Pedido de recuperacao de password emailHash=${this.hashAuditValue(email)}`,
    );

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
        `Recuperacao de password ignorada emailHash=${this.hashAuditValue(email)} motivo=${!user ? 'utilizador-inexistente' : 'utilizador-inativo'}`,
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
      `Email de recuperacao de password enviado userId=${user.ID_Utilizador} emailHash=${this.hashAuditValue(email)}`,
    );

    return respostaGenerica;
  }

  /**
   * Conclui o fluxo de redefinicao de password.
   * @param resetPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    this.logger.log('Pedido de redefinicao de password recebido.');

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
    }

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
    this.logger.log(`Password redefinida com sucesso userId=${user.ID_Utilizador}`);

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
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Direcao: true,
            Enc_Educacao: true,
          },
        },
      },
    });
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
