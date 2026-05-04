import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoInteresse } from '../enums/tipo-interesse.enum';

/**
 * DTO usado para transportar os dados de Registar Interesse Marketplace.
 */

export class RegistarInteresseMarketplaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensagem?: string;

  @IsOptional()
  @IsEnum(TipoInteresse)
  tipo?: TipoInteresse;

  @IsOptional()
  @IsString()
  dataRecolhaPrevista?: string;
}
