// Ficheiro: Backend/src/marketplace/dto/listar-anuncios-marketplace.dto.ts

import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';
import { OrigemRegisto } from '../enums/origem-registo.enum';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO com filtros aceites na listagem de anúncios do Marketplace.
 */
export class ListarAnunciosMarketplaceDto {
    @IsOptional()
    @IsString()
    pesquisa?: string;

    @IsOptional()
    @IsEnum(TipoAnuncio)
    tipoAnuncio?: TipoAnuncio;

    @IsOptional()
    @IsEnum(EstadoAnuncio)
    estado?: EstadoAnuncio;

    @IsOptional()
    @IsEnum(OrigemRegisto)
    origem?: OrigemRegisto;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    idCriador?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    publicado?: boolean;
}
