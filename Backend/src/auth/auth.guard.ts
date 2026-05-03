import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';

@Injectable()
/**
 * Guard que valida o JWT recebido no header `Authorization`.
 */
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Confirma a autenticidade do token e injeta o payload no request.
     *
     * @param context - Contexto da execução HTTP atual.
     * @returns `true` quando o pedido pode continuar.
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
    
        if (!token) {
            throw new UnauthorizedException('Acesso negado. Precisas de fazer login.');
        }
    
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow<string>('JWT_SECRET')
            });
            request['user'] = payload;
        } catch {
            throw new UnauthorizedException('Token inválido ou expirado.');
        }
        return true;
    }

    /**
     * Extrai o token JWT do header `Authorization`.
     *
     * @param request - Pedido HTTP atual.
     * @returns Token sem o prefixo `Bearer`, quando existe.
     */
    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
} 
