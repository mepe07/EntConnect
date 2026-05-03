import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/**
 * DTO usado para alterar o estado de um anúncio.
 */
export class AlterarEstadoAnuncioDto {
    @IsEnum(EstadoAnuncio)
    estado: EstadoAnuncio;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo?: string;
}
