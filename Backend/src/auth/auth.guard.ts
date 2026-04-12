// Ficheiro: src/auth/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
    
        if (!token) {
            throw new UnauthorizedException('Acesso negado. Precisas de fazer login.');
        }
    
        try {
            // O segurança verifica se o bilhete é verdadeiro usando a mesma palavra-passe
            const payload = await this.jwtService.verifyAsync(token, {
                secret: 'Entco##ect' // ATENÇÃO: Igual à que tens no auth.module.ts!
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