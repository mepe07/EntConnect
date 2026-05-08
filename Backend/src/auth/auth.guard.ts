import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';
/**
 * Guarda responsavel por validar o acesso de Auth.
 */

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Indica se o pedido pode prosseguir.
   * @param context Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn(
        `Pedido sem token ${request.method} ${request.originalUrl ?? request.url}`,
      );
      throw new UnauthorizedException(
        'Acesso negado. Precisas de fazer login.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      request['user'] = payload;
    } catch {
      this.logger.warn(
        `Token invalido ou expirado ${request.method} ${request.originalUrl ?? request.url}`,
      );
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    return true;
  }

  /**
   * Executa a operacao extract token from header.
   * @param request Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
