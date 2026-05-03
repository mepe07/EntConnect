// Ficheiro: src/marketplace/mappers/marketplace-artigo.mapper.ts

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
    Marketplace Artigo Mapper

    Este ficheiro centraliza a construção dos objetos `data` usados nas operações
    Prisma relacionadas com Artigo e Stock_Armazem.

    A ideia é evitar que o MarketplaceService fique cheio de blocos grandes
    de `data: { ... }`, deixando o service focado no fluxo principal.

    Responsabilidades deste mapper:
    - montar dados para criar anúncios;
    - montar dados para criar stock associado;
    - montar dados para criar itens de inventário;
    - montar dados para publicar inventário no Marketplace;
    - montar dados para atualizar anúncios e stock.

    Vantagens:
    - reduz repetição;
    - melhora legibilidade do service;
    - centraliza alterações caso algum campo da base de dados mude;
    - mantém os objetos de escrita do Prisma tipados.
*/

/*
    Representa o resultado da distribuição de stock.

    Esta informação vem do helper resolverDistribuicaoStock().
    O mapper não decide regras de stock; apenas recebe o resultado já validado
    e transforma-o no formato esperado pelo Prisma.
*/
interface DistribuicaoStockMapper {
    tipoAnuncio: TipoAnuncio;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

/*
    Monta os dados necessários para criar um Artigo de Marketplace.

    Este método é usado quando um utilizador cria um novo anúncio.

    Nota importante:
    O Tipo_Anuncio vem da distribuição calculada, e não diretamente do DTO.
    Isto garante coerência entre:
    - tipo do anúncio;
    - quantidade para venda;
    - quantidade para aluguer.
*/
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

/*
    Monta os dados de stock para um anúncio criado por um utilizador.

    O stock fica associado ao artigo recém-criado através do ID_Artigo.

    Aqui gravamos:
    - quantidade total;
    - quantidade disponível para venda;
    - quantidade disponível para aluguer;
    - características opcionais como cor, tamanho e estado.

    As quantidades de venda e aluguer vêm da distribuição validada previamente.
*/
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

/*
    Monta os dados para criar um item no inventário da escola.

    Este item nasce como Artigo, mas ainda não fica publicado no Marketplace.
    Por isso:
    - Origem_Registo é INVENTARIO_ESCOLA;
    - Publicado_No_Marketplace começa como false;
    - Estado_Anuncio começa como ATIVO.

    A publicação efetiva é feita depois, no fluxo publicarInventarioDaEscola().
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

/*
    Monta os dados de stock inicial para um item do inventário da escola.

    Nesta fase, o item ainda não está publicado no Marketplace.
    Por isso, as quantidades de venda e aluguer começam a zero.

    A distribuição real de venda/aluguer só é definida quando o item é publicado.
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

/*
    Monta os dados de stock quando um item do inventário é publicado.

    Nesta fase, o item já existe.
    Apenas atualizamos a distribuição entre:
    - quantidade para venda;
    - quantidade para aluguer.

    A quantidade total já vem do stock existente.
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

/*
    Monta os dados do Artigo quando um item do inventário passa a ser publicado
    no Marketplace.

    Este método transforma um artigo interno da escola num anúncio visível.

    Mantém valores existentes quando o DTO não envia nova informação.
    Exemplo:
    - se não vier novo título, mantém artigo.Nome;
    - se não vier nova descrição, mantém artigo.Descricao;
    - se não vier nova foto, mantém artigo.Foto.
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

/*
    Monta os dados de atualização do stock de um anúncio.

    Este método é usado quando um anúncio é editado.

    Atualiza:
    - quantidade total;
    - distribuição venda/aluguer;
    - características opcionais como cor, estado e tamanho.

    Quando o DTO não envia uma característica, mantém-se o valor já existente
    no stockPrincipal.
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

/*
    Monta os dados de atualização do Artigo de Marketplace.

    Este método é usado quando um utilizador edita um anúncio.

    Mantém valores antigos quando o DTO não envia novos valores:
    - título;
    - descrição;
    - notas internas;
    - foto.

    O tipo do anúncio volta a ser definido pela distribuição de stock,
    garantindo consistência entre tipo, venda e aluguer.
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