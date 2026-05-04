import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO usado para transportar os dados de Update Aula Fixa.
 */

export class UpdateAulaFixaDto {
  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
