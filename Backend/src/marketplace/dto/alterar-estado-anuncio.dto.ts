import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/**
 * DTO usado para transportar os dados de Alterar Estado Anuncio.
 */

export class AlterarEstadoAnuncioDto {
  @IsEnum(EstadoAnuncio)
  estado: EstadoAnuncio;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
