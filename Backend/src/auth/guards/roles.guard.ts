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
/**
 * Guard que compara a role do utilizador autenticado com as roles exigidas no endpoint.
 */
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    /**
     * Determina se o utilizador autenticado pode executar o endpoint atual.
     *
     * @param context - Contexto da execução HTTP atual.
     * @returns `true` quando a role do utilizador é permitida.
     */
    canActivate(context: ExecutionContext): boolean {
        const rolesPermitidas = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!rolesPermitidas || rolesPermitidas.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const utilizador = request.user as UtilizadorAutenticado | undefined;

        if (!utilizador) {
            throw new ForbiddenException('Utilizador não autenticado.');
        }

        const temPermissao = rolesPermitidas.includes(utilizador.role);

        if (!temPermissao) {
            throw new ForbiddenException('Sem permissões para aceder a este endpoint.');
        }

        return true;
    }
} 
