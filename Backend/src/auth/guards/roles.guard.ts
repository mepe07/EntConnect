import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/roles.enum';
import { UtilizadorAutenticado } from '../../common/interfaces/utilizador-autenticado.interface';
/**
 * Guarda responsavel por validar o acesso de Roles.
 */

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Indica se o pedido pode prosseguir.
   * @param context Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidas = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesPermitidas || rolesPermitidas.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const utilizador = request.user as UtilizadorAutenticado | undefined;

    if (!utilizador) {
      this.logger.warn(
        `Acesso bloqueado sem utilizador autenticado ${request.method} ${request.originalUrl ?? request.url}`,
      );
      throw new ForbiddenException('Utilizador não autenticado.');
    }

    const temPermissao = rolesPermitidas.includes(utilizador.role);

    if (!temPermissao) {
      this.logger.warn(
        `Acesso negado por role userId=${utilizador.sub} role=${utilizador.role} rolesPermitidas=${rolesPermitidas.join(',')}`,
      );
      throw new ForbiddenException(
        'Sem permissões para aceder a este endpoint.',
      );
    }

    return true;
  }
}
