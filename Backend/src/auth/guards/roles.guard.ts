// Ficheiro: src/auth/guards/roles.guard.ts

/*
O que é um Guard?

Guards são classes que implementam a interface CanActivate do NestJS.
São usados para determinar se uma requisição pode ou não aceder a um endpoint.

De forma simples:
“este pedido pode continuar ou deve ser bloqueado?”

- O AuthGuard verifica se o utilizador está autenticado.
  Se não estiver autenticado, o pedido deve ser bloqueado com 401 Unauthorized.

- O RolesGuard verifica se o utilizador autenticado tem a role necessária
  para aceder a um endpoint específico.
  Se não tiver permissão, o pedido deve ser bloqueado com 403 Forbidden.
*/

import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/roles.enum';
import { UtilizadorAutenticado } from '../../common/interfaces/utilizador-autenticado.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Vai buscar as roles definidas no endpoint ou no controller.
        const rolesPermitidas = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Se o endpoint não tiver @Roles(...), o guard não bloqueia.
        // Assim só restringimos onde for explicitamente pedido.
        if (!rolesPermitidas || rolesPermitidas.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const utilizador = request.user as UtilizadorAutenticado | undefined;

        // Se por algum motivo não existir utilizador no request,
        // significa que o AuthGuard não correu ou falhou.
        if (!utilizador) {
            throw new ForbiddenException('Utilizador não autenticado.');
        }

        // Compara a role do token com as roles permitidas no endpoint.
        const temPermissao = rolesPermitidas.includes(utilizador.role);

        if (!temPermissao) {
            throw new ForbiddenException('Sem permissões para aceder a este endpoint.');
        }

        return true;
    }
} 