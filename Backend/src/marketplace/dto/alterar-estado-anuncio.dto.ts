// Ficheiro: Backend/src/marketplace/dto/alterar-estado-anuncio.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

export class AlterarEstadoAnuncioDto {
    @IsEnum(EstadoAnuncio)
    estado: EstadoAnuncio;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo?: string;
}
