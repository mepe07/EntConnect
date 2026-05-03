import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO usado para atualizar parcialmente um horário fixo.
 */
export class UpdateAulaFixaDto {
  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
