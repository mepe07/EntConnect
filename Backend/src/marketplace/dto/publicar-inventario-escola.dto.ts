// Ficheiro: Backend/src/marketplace/dto/publicar-inventario-escola.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

export class PublicarInventarioEscolaDto {
    @Type(() => Number)
    @IsInt({ message: 'O ID do artigo é obrigatório.' })
    @Min(1)
    idArtigo: number;

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

    @IsEnum(TipoAnuncio)
    tipoAnuncio: TipoAnuncio;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade disponível tem de ser um número inteiro.' })
    @Min(1)
    quantidadeDisponivel?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade para venda tem de ser um número inteiro.' })
    @Min(0)
    quantidadeVenda?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade para aluguer tem de ser um número inteiro.' })
    @Min(0)
    quantidadeAluguer?: number;
}
