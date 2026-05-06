import { IsEnum } from 'class-validator';
import { Role } from '../enums/roles.enum';

/**
 * DTO usado para trocar a role ativa da sessao.
 */
export class TrocarRoleDto {
  @IsEnum(Role)
  role: Role;
}
