// Ficheiro: Backend/src/marketplace/dto/listar-anuncios-marketplace.dto.ts

import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';
import { OrigemRegisto } from '../enums/origem-registo.enum';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO com os filtros aceites na listagem de anúncios do Marketplace.
 *
 * Este DTO é usado em query params, por isso alguns valores chegam como string.
 * Campos numéricos e booleanos são convertidos com class-transformer antes
 * de chegarem ao service.
 *
 * A listagem pode ser filtrada por pesquisa textual, tipo, estado, origem,
 * criador e publicação.
 */
export class ListarAnunciosMarketplaceDto {
    @IsOptional()
    @IsString()
    pesquisa?: string;    // Texto livre usado para pesquisar por nome, descrição ou notas do anúncio.

    @IsOptional()
    @IsEnum(TipoAnuncio)
    tipoAnuncio?: TipoAnuncio;    // Filtra anúncios por tipo: venda, aluguer ou ambos.

    @IsOptional()
    @IsEnum(EstadoAnuncio)
    estado?: EstadoAnuncio;    // Filtra anúncios pelo estado atual.

    @IsOptional()
    @IsEnum(OrigemRegisto)
    origem?: OrigemRegisto;    // Filtra anúncios pela origem do registo: utilizador ou inventário da escola.

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    idCriador?: number;    // Filtra anúncios criados por um utilizador específico.

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    publicado?: boolean;    // Indica se devem ser devolvidos apenas anúncios publicados ou não publicados.
}
