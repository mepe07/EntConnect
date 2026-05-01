// Ficheiro: src/marketplace/marketplace-artigo.mapper.ts

import { Prisma } from '@prisma/client';

import { CriarAnuncioMarketplaceDto } from './dto/criar-anuncio-marketplace.dto';
import { CriarItemInventarioDto } from './dto/criar-item-inventario.dto';

import { EstadoAnuncio } from './enums/estado-anuncio.enum';
import { OrigemRegisto } from './enums/origem-registo.enum';

/*
    Este ficheiro centraliza a criação dos objetos `data` usados pelo Prisma.

    Vantagem:
    - o MarketplaceService fica mais limpo;
    - evitamos blocos grandes de data: { ... } espalhados;
    - se algum campo mudar no Prisma, corrigimos aqui;
    - mantemos a lógica de construção de dados num sítio próprio.
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