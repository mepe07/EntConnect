// Ficheiro: Backend/src/marketplace/dto/atualizar-anuncio-marketplace.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO usado para atualizar um anúncio existente no Marketplace.
 *
 * Todos os campos são opcionais porque numa edição o utilizador pode alterar
 * apenas uma parte do anúncio.
 *
 * Este DTO valida:
 * - texto editável do anúncio;
 * - novo tipo de anúncio, se for enviado;
 * - quantidades de stock;
 * - características opcionais como cor, estado e tamanho.
 *
 * A regra de manter valores antigos quando um campo não é enviado fica no mapper/service,
 * não no DTO.
 */
export class AtualizarAnuncioMarketplaceDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    titulo?: string;    // Novo título do anúncio, quando o utilizador decide alterá-lo.

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;    // Nova descrição pública do anúncio.

    @IsOptional()
    @IsString()
    foto?: string;    // Nova URL da foto do anúncio, quando o utilizador decide alterá-la.

    @IsOptional()
    @IsEnum(TipoAnuncio)
    tipoAnuncio?: TipoAnuncio;   // Novo tipo de anúncio, caso o utilizador queira alterar entre venda, aluguer ou ambos.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantidadeTotal?: number;   // Nova quantidade total do artigo, caso o utilizador queira atualizar o stock total. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantidadeDisponivel?: number;  // Nova quantidade disponível do artigo, usada quando não há divisão venda/aluguer. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeVenda?: number;   // Nova quantidade reservada para venda, caso o utilizador queira atualizar. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeAluguer?: number;  // Nova quantidade reservada para aluguer, caso o utilizador queira atualizar. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idCor?: number;     // Novo identificador da cor associada ao artigo, caso o utilizador queira alterar a cor. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idEstado?: number;   // Novo identificador do estado do artigo, caso o utilizador queira alterar o estado. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idTamanho?: number;  // Novo identificador do tamanho do artigo, caso o utilizador queira alterar o tamanho. Se não for enviado, mantém o valor antigo.

    @IsOptional()
    @IsString()
    @MaxLength(255)
    notasInternas?: string;   // Novas notas internas do anúncio, usadas para informações administrativas. Se não for enviado, mantém o valor antigo.
}
