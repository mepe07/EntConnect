// Ficheiro: Backend/src/marketplace/dto/atualizar-anuncio-marketplace.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

export class AtualizarAnuncioMarketplaceDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    titulo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;

    @IsOptional()
    @IsString()
    foto?: string;

    @IsOptional()
    @IsEnum(TipoAnuncio)
    tipoAnuncio?: TipoAnuncio;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantidadeTotal?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantidadeDisponivel?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeVenda?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeAluguer?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idCor?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idEstado?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idTamanho?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    notasInternas?: string;
}
