import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Executa a operacao roles.
 * @param roles Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
