// Ficheiro: Backend/src/marketplace/dto/publicar-inventario-escola.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO usado para publicar um item do inventário da escola no Marketplace.
 *
 * O artigo já existe previamente como item de inventário.
 * Este DTO define os dados necessários para transformar esse item num anúncio.
 *
 * Permite:
 * - identificar o artigo do inventário;
 * - ajustar título, descrição e foto;
 * - definir o tipo de anúncio;
 * - definir a quantidade disponível ou a distribuição entre venda e aluguer.
 */
export class PublicarInventarioEscolaDto {
    @Type(() => Number)
    @IsInt({ message: 'O ID do artigo é obrigatório.' })
    @Min(1)
    idArtigo: number;    // Identificador do artigo de inventário que será publicado no Marketplace.

    @IsOptional()
    @IsString()
    @MaxLength(255)
    titulo?: string;    // Título opcional para sobrescrever o nome atual do artigo.

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;    // Descrição opcional para apresentar o artigo no Marketplace.

    @IsOptional()
    @IsString()
    foto?: string;    // URL opcional da foto a usar na publicação.

    @IsEnum(TipoAnuncio)
    tipoAnuncio: TipoAnuncio;    // Tipo de disponibilização: venda, aluguer ou ambos.

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade disponível tem de ser um número inteiro.' })
    @Min(1)
    quantidadeDisponivel?: number;    // Quantidade simples disponível no Marketplace, quando não há divisão explícita.

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade para venda tem de ser um número inteiro.' })
    @Min(0)
    quantidadeVenda?: number;    // Quantidade do stock que ficará disponível para venda.

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade para aluguer tem de ser um número inteiro.' })
    @Min(0)
    quantidadeAluguer?: number;    // Quantidade do stock que ficará disponível para aluguer.
}
