import { Prisma } from '@prisma/client';

import { CriarAnuncioMarketplaceDto } from '../dto/criar-anuncio-marketplace.dto';
import { CriarItemInventarioDto } from '../dto/criar-item-inventario.dto';
import { AtualizarAnuncioMarketplaceDto } from '../dto/atualizar-anuncio-marketplace.dto';
import { PublicarInventarioEscolaDto } from '../dto/publicar-inventario-escola.dto';

import { EstadoAnuncio } from '../enums/estado-anuncio.enum';
import { OrigemRegisto } from '../enums/origem-registo.enum';

import {
    type ArtigoComBase,
    type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

/**
 * Estrutura intermédia usada para transportar a distribuição de stock nos mappers.
 */
interface DistribuicaoStockMapper {
    tipoAnuncio: string;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

/**
 * Monta os dados Prisma para criar um anúncio de utilizador.
 *
 * @param params - Dados necessários para construir o artigo.
 * @returns Payload Prisma para criação do artigo.
 */
export function montarDadosCriacaoAnuncio(params: {
    dto: CriarAnuncioMarketplaceDto;
    idUtilizadorCriador: number;
    urlFoto: string | null;
    dataAtual: Date;
}): Prisma.ArtigoUncheckedCreateInput {
    const {
        dto,
        idUtilizadorCriador,
        urlFoto,
        dataAtual,
    } = params;

    return {
        Nome: dto.titulo,
        Descricao: dto.descricao ?? null,
        Notas: dto.notasInternas ?? null,
        Foto: urlFoto,
        Tipo_Anuncio: dto.tipoAnuncio,
        Origem_Registo: OrigemRegisto.UTILIZADOR,
        Publicado_No_Marketplace: true,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        ID_Utilizador_Criador: idUtilizadorCriador,
        Data_Criacao: dataAtual,
        Data_Atualizacao: dataAtual,
    };
}

/**
 * Monta os dados Prisma para criar o stock inicial de um anúncio.
 *
 * @param params - Identificador do artigo e DTO de criação.
 * @returns Payload Prisma para criação de stock.
 */
export function montarDadosStockCriacaoAnuncio(params: {
    idArtigo: number;
    dto: CriarAnuncioMarketplaceDto;
}): Prisma.Stock_ArmazemUncheckedCreateInput {
    const { idArtigo, dto } = params;

    return {
        ID_Artigo: idArtigo,
        Quantidade_Total: dto.quantidadeTotal,
        ID_Tamanho: dto.idTamanho ? Number(dto.idTamanho) : null,
        ID_Estado: dto.idEstado ? Number(dto.idEstado) : null,
    };
}

/**
 * Monta os dados Prisma para criar um item de inventário interno.
 *
 * @param params - Dados do item de inventário.
 * @returns Payload Prisma para criação do artigo.
 */
export function montarDadosCriacaoItemInventario(params: {
    dto: CriarItemInventarioDto;
    idUtilizadorCriador: number;
    urlFoto: string | null;
    dataAtual: Date;
}): Prisma.ArtigoUncheckedCreateInput {
    const {
        dto,
        idUtilizadorCriador,
        urlFoto,
        dataAtual,
    } = params;

    return {
        Nome: dto.titulo,
        Descricao: dto.descricao ?? null,
        Foto: urlFoto,
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Publicado_No_Marketplace: false,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        ID_Utilizador_Criador: idUtilizadorCriador,
        Data_Criacao: dataAtual,
        Data_Atualizacao: dataAtual,
    };
}

/**
 * Monta os dados Prisma para criar stock de inventário interno.
 *
 * @param params - Identificador do artigo e DTO do inventário.
 * @returns Payload Prisma para criação de stock.
 */
export function montarDadosStockItemInventario(params: {
    idArtigo: number;
    dto: CriarItemInventarioDto;
}): Prisma.Stock_ArmazemUncheckedCreateInput {
    const { idArtigo, dto } = params;

    return {
        ID_Artigo: idArtigo,
        Quantidade_Total: dto.quantidade,
        Quantidade_Venda: 0,
        Quantidade_Aluguer: 0,
    };
} 

/**
 * Monta os dados Prisma para atualizar o stock ao publicar inventário escolar.
 *
 * @param params - Distribuição final de stock.
 * @returns Payload Prisma para atualização de stock.
 */
export function montarDadosStockPublicacaoInventario(params: {
        distribuicao: DistribuicaoStockMapper;
    }): Prisma.Stock_ArmazemUncheckedUpdateInput {
    const { distribuicao } = params;
    
    return {
        Quantidade_Venda: distribuicao.quantidadeVenda,
        Quantidade_Aluguer: distribuicao.quantidadeAluguer,
    };
}

/**
 * Monta os dados Prisma para publicar um artigo do inventário escolar no Marketplace.
 *
 * @param params - Dados de publicação e artigo base.
 * @returns Payload Prisma para atualização do artigo.
 */
export function montarDadosPublicacaoInventario(params: {
    dto: PublicarInventarioEscolaDto;
    artigo: ArtigoComBase;
    distribuicao: DistribuicaoStockMapper;
    dataAtual: Date;
}): Prisma.ArtigoUncheckedUpdateInput {
    const {
        dto,
        artigo,
        distribuicao,
        dataAtual,
    } = params;

    return {
        Nome: dto.titulo ?? artigo.Nome,
        Descricao: dto.descricao ?? artigo.Descricao ?? null,
        Foto: dto.foto ?? artigo.Foto ?? null,
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Tipo_Anuncio: distribuicao.tipoAnuncio,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        Publicado_No_Marketplace: true,
        Data_Atualizacao: dataAtual,
    };
}

/**
 * Monta os dados Prisma para atualizar o stock de um anúncio existente.
 *
 * @param params - DTO, stock principal e distribuição final.
 * @returns Payload Prisma para atualização do stock.
 */
export function montarDadosStockAtualizacaoAnuncio(params: {
    dto: AtualizarAnuncioMarketplaceDto;
    stockPrincipal: StockPrincipalMarketplace;
    quantidadeTotalFinal: number;
    distribuicao: DistribuicaoStockMapper;
}): Prisma.Stock_ArmazemUncheckedUpdateInput {
    const {
        dto,
        stockPrincipal,
        quantidadeTotalFinal,
        distribuicao,
    } = params;

    return {
        Quantidade_Total: quantidadeTotalFinal,
        Quantidade_Venda: distribuicao.quantidadeVenda,
        Quantidade_Aluguer: distribuicao.quantidadeAluguer,
        ID_Cor: dto.idCor ?? stockPrincipal.ID_Cor ?? null,
        ID_Estado: dto.idEstado ?? stockPrincipal.ID_Estado ?? null,
        ID_Tamanho: dto.idTamanho ?? stockPrincipal.ID_Tamanho ?? null,
    };
}

/**
 * Monta os dados Prisma para atualizar um anúncio existente.
 *
 * @param params - DTO, artigo base e foto final.
 * @returns Payload Prisma para atualização do artigo.
 */
export function montarDadosAtualizacaoAnuncio(params: {
    dto: AtualizarAnuncioMarketplaceDto;
    artigo: ArtigoComBase;
    urlFotoFinal: string | null;
    distribuicao: DistribuicaoStockMapper;
    dataAtual: Date;
}): Prisma.ArtigoUncheckedUpdateInput {
    const {
        dto,
        artigo,
        urlFotoFinal,
        distribuicao,
        dataAtual,
    } = params;

    return {
        Nome: dto.titulo ?? artigo.Nome,
        Descricao: dto.descricao ?? artigo.Descricao ?? null,
        Foto: urlFotoFinal,
        Notas: dto.notasInternas ?? artigo.Notas ?? null,
        Tipo_Anuncio: distribuicao.tipoAnuncio,
        Data_Atualizacao: dataAtual,
    };
} 
