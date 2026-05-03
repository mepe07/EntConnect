// Ficheiro: src/marketplace/marketplace-artigo.mapper.ts

import { Prisma } from '@prisma/client';

import { CriarAnuncioMarketplaceDto } from '../dto/criar-anuncio-marketplace.dto';
import { CriarItemInventarioDto } from '../dto/criar-item-inventario.dto';
import { AtualizarAnuncioMarketplaceDto } from '../dto/atualizar-anuncio-marketplace.dto';
import { PublicarInventarioEscolaDto } from '../dto/publicar-inventario-escola.dto';

import { EstadoAnuncio } from '../enums/estado-anuncio.enum';
import { OrigemRegisto } from '../enums/origem-registo.enum';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

import {
    type ArtigoComBase,
    type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

/*
    Este ficheiro centraliza a criação dos objetos `data` usados pelo Prisma.

    Vantagem:
    - o MarketplaceService fica mais limpo;
    - evitamos blocos grandes de data: { ... } espalhados;
    - se algum campo mudar no Prisma, corrigimos aqui;
    - mantemos a lógica de construção de dados num sítio próprio.
*/

interface DistribuicaoStockMapper {
    tipoAnuncio: TipoAnuncio;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

export function montarDadosCriacaoAnuncio(params: {
    dto: CriarAnuncioMarketplaceDto;
    idUtilizadorCriador: number;
    urlFoto: string | null;
    dataAtual: Date;
    distribuicao: DistribuicaoStockMapper;
}): Prisma.ArtigoUncheckedCreateInput {
    const {
        dto,
        idUtilizadorCriador,
        urlFoto,
        dataAtual,
        distribuicao,
    } = params;

    return {
        Nome: dto.titulo,
        Descricao: dto.descricao ?? null,
        Notas: dto.notasInternas ?? null,
        Foto: urlFoto,
        Tipo_Anuncio: distribuicao.tipoAnuncio,
        Origem_Registo: OrigemRegisto.UTILIZADOR,
        Publicado_No_Marketplace: true,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        ID_Utilizador_Criador: idUtilizadorCriador,
        Data_Criacao: dataAtual,
        Data_Atualizacao: dataAtual,
    };
}

export function montarDadosStockCriacaoAnuncio(params: {
    idArtigo: number;
    dto: CriarAnuncioMarketplaceDto;
    distribuicao: DistribuicaoStockMapper;
}): Prisma.Stock_ArmazemUncheckedCreateInput {
    const {
        idArtigo,
        dto,
        distribuicao,
    } = params;

    return {
        ID_Artigo: idArtigo,
        Quantidade_Total: dto.quantidadeTotal,
        Quantidade_Venda: distribuicao.quantidadeVenda,
        Quantidade_Aluguer: distribuicao.quantidadeAluguer,
        ID_Cor: dto.idCor ? Number(dto.idCor) : null,
        ID_Tamanho: dto.idTamanho ? Number(dto.idTamanho) : null,
        ID_Estado: dto.idEstado ? Number(dto.idEstado) : null,
    };
}

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

export function montarDadosStockPublicacaoInventario(params: {
        distribuicao: DistribuicaoStockMapper;
    }): Prisma.Stock_ArmazemUncheckedUpdateInput {
    const { distribuicao } = params;
    
    return {
        Quantidade_Venda: distribuicao.quantidadeVenda,
        Quantidade_Aluguer: distribuicao.quantidadeAluguer,
    };
}

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