import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

/**
 * Chave de metadata usada para guardar as roles autorizadas.
 */
export const ROLES_KEY = 'roles';

/**
 * Declara as roles autorizadas para um controller ou endpoint.
 *
 * @param roles - Roles permitidas para aceder ao recurso.
 * @returns Decorator NestJS com metadata de autorização.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
