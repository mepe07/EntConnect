import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAulaFixaDto {
  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
