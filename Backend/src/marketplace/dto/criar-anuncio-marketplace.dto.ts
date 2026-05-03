// Ficheiro: Backend/src/marketplace/dto/criar-anuncio-marketplace.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO usado para criar um anúncio no Marketplace.
 *
 * Este objeto representa os dados recebidos do frontend quando um utilizador
 * cria um novo anúncio.
 *
 * Responsabilidades principais:
 * - validar dados obrigatórios, como título, tipo de anúncio e quantidade total;
 * - converter campos numéricos recebidos por FormData para number;
 * - validar a distribuição opcional entre venda e aluguer;
 * - validar características opcionais do artigo, como cor, estado e tamanho.
 *
 * A imagem não é validada neste DTO porque chega como ficheiro via multipart/form-data.
 * A validação da imagem é feita no helper de fotos do Marketplace.
 */
export class CriarAnuncioMarketplaceDto {
    @IsString({ message: 'O titulo do anúncio é obrigatório.' })
    @MaxLength(255)
    titulo: string;    // Título visível do anúncio no Marketplace.

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;    // Descrição pública do anúncio, usada para explicar o artigo ao interessado.

    @IsOptional()
    @IsString()
    foto?: string;    // URL textual da foto, quando aplicável. Upload físico é tratado separadamente.

    @IsEnum(TipoAnuncio)
    tipoAnuncio: TipoAnuncio;    // Define se o artigo será disponibilizado para venda, aluguer ou ambos.

    @Type(() => Number)
    @IsInt({ message: 'A quantidade total tem de ser um número inteiro.' })
    @Min(1)
    quantidadeTotal: number;    // Quantidade total existente do artigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'A quantidade disponível tem de ser um número inteiro.' })
    @Min(1)
    quantidadeDisponivel?: number;    // Quantidade simples disponível no Marketplace, usada quando não há divisão venda/aluguer.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeVenda?: number;    // Quantidade reservada especificamente para venda.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantidadeAluguer?: number;    // Quantidade reservada especificamente para aluguer.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idCor?: number;    // Identificador opcional da cor associada ao artigo.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idEstado?: number;   // Identificador opcional do estado de conservação do artigo (ex: novo, usado, etc.).

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    idTamanho?: number;   // Identificador opcional do tamanho do artigo.

    @IsOptional()
    @IsString()
    @MaxLength(255)
    notasInternas?: string;    // Notas internas do artigo, visíveis apenas para administradores.
}
