// Ficheiro: src/auth/auth.guard.ts

/* O que é um Guard?

Guards são classes que implementam a interface CanActivate do NestJS.

Eles são usados para determinar se uma requisição pode ou não acessar um determinado endpoint.
Por exemplo, podemos usar um guard para verificar se o utilizador está autenticado antes de permitir o acesso a um recurso.

!!!!!!
Diferente do roles.guard.ts, que verifica se o utilizador tem a role necessária para acessar um endpoint específico,
o auth.guard.ts verifica se o utilizador está autenticado, ou seja, se ele tem um token válido.

*/

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
    
        if (!token) {
            throw new UnauthorizedException('Acesso negado. Precisas de fazer login.');
        }
    
        try {
            // O segurança verifica se o bilhete é verdadeiro usando a mesma palavra-passe
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow<string>('JWT_SECRET')
            });
      
            // Se for verdadeiro, ele guarda os dados do utilizador no pedido (request)
            // Assim, o Controlador sabe sempre quem é que está a fazer a ação!
            request['user'] = payload;
        } catch {
            throw new UnauthorizedException('Token inválido ou expirado.');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        // O React envia o token no formato: "Bearer eyJhbGciOiJIUzI1Ni..."
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
} 