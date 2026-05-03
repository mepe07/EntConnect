// Ficheiro: src/marketplace/marketplace-stock.helpers.ts

import { BadRequestException } from '@nestjs/common';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';
import {
    type ArtigoComBase,
    type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

/*
    Parâmetros necessários para calcular a distribuição de stock
    entre venda e aluguer.

    Esta interface existe para evitar `any` e deixar claro o que a função precisa.
*/
interface ResolverDistribuicaoStockParams {
    tipoAnuncio: TipoAnuncio;
    quantidadeTotal: number;
    quantidadeDisponivel?: number;
    quantidadeVenda?: number;
    quantidadeAluguer?: number;
    quantidadeVendaAtual?: number;
    quantidadeAluguerAtual?: number;
    permitirManterDistribuicaoAtual?: boolean;
}

/*
    Resultado final da distribuição de stock.

    O Marketplace trabalha com:
    - quantidade total no inventário;
    - quantidade disponível no marketplace;
    - quantidade para venda;
    - quantidade para aluguer.
*/
interface DistribuicaoStockResultado {
    tipoAnuncio: TipoAnuncio;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

/*
    Valida se a quantidade disponível não ultrapassa a quantidade total.

    Exemplo:
    - quantidade total: 5
    - quantidade disponível: 8

    Isto seria inválido, porque não podes anunciar mais unidades do que tens.
*/
function validarQuantidades(
    quantidadeTotal: number,
    quantidadeDisponivel: number,
): void {
    if (quantidadeDisponivel > quantidadeTotal) {
        throw new BadRequestException(
            'A quantidade disponível no Marketplace não pode ser maior do que a quantidade total.',
        );
    }
}

/*
    Decide automaticamente o tipo do anúncio com base nas quantidades.

    Exemplos:
    - venda > 0 e aluguer > 0 -> ambos
    - só aluguer > 0 -> aluguer
    - caso contrário -> venda
*/
function derivarTipoAnuncio(
    quantidadeVenda: number,
    quantidadeAluguer: number,
): TipoAnuncio {
    if (quantidadeVenda > 0 && quantidadeAluguer > 0) {
        return TipoAnuncio.AMBOS;
    }

    if (quantidadeAluguer > 0) {
        return TipoAnuncio.ALUGUER;
    }

    return TipoAnuncio.VENDA;
}

/*
    Resolve a distribuição de stock de um anúncio.

    Esta função é usada quando:
    - criamos um anúncio;
    - atualizamos um anúncio;
    - publicamos um item do inventário no marketplace.

    A função suporta dois modos:
    1. Distribuição explícita:
       quantidadeVenda + quantidadeAluguer

    2. Quantidade disponível simples:
       quantidadeDisponivel

    Também permite manter a distribuição atual quando estamos a editar um anúncio.
*/
export function resolverDistribuicaoStock(
    params: ResolverDistribuicaoStockParams,
): DistribuicaoStockResultado {
    const {
        tipoAnuncio,
        quantidadeTotal,
        quantidadeDisponivel,
        quantidadeVenda,
        quantidadeAluguer,
        quantidadeVendaAtual = 0,
        quantidadeAluguerAtual = 0,
        permitirManterDistribuicaoAtual = false,
    } = params;

    const recebeuDistribuicaoExplicita =
        quantidadeVenda !== undefined || quantidadeAluguer !== undefined;

    if (recebeuDistribuicaoExplicita) {
        const vendaFinal = quantidadeVenda ?? 0;
        const aluguerFinal = quantidadeAluguer ?? 0;
        const totalAlocado = vendaFinal + aluguerFinal;

        if (totalAlocado <= 0) {
            throw new BadRequestException(
                'Indica pelo menos 1 unidade para venda ou aluguer.',
            );
        }

        validarQuantidades(quantidadeTotal, totalAlocado);

        return {
            tipoAnuncio: derivarTipoAnuncio(vendaFinal, aluguerFinal),
            quantidadeVenda: vendaFinal,
            quantidadeAluguer: aluguerFinal,
            quantidadeDisponivel: totalAlocado,
        };
    }

    if (quantidadeDisponivel === undefined) {
        if (permitirManterDistribuicaoAtual) {
            const totalAtual = quantidadeVendaAtual + quantidadeAluguerAtual;

            if (totalAtual <= 0) {
                throw new BadRequestException(
                    'O anúncio não tem distribuição atual válida para manter.',
                );
            }

            validarQuantidades(quantidadeTotal, totalAtual);

            return {
                tipoAnuncio: derivarTipoAnuncio(
                    quantidadeVendaAtual,
                    quantidadeAluguerAtual,
                ),
                quantidadeVenda: quantidadeVendaAtual,
                quantidadeAluguer: quantidadeAluguerAtual,
                quantidadeDisponivel: totalAtual,
            };
        }

        throw new BadRequestException(
            'Indica a quantidade disponível ou a distribuição por venda/aluguer.',
        );
    }

    validarQuantidades(quantidadeTotal, quantidadeDisponivel);

    if (tipoAnuncio === TipoAnuncio.AMBOS) {
        throw new BadRequestException(
            'Para anúncios com tipo "ambos", indica quantidades separadas para venda e aluguer.',
        );
    }

    return {
        tipoAnuncio,
        quantidadeVenda:
            tipoAnuncio === TipoAnuncio.VENDA ? quantidadeDisponivel : 0,
        quantidadeAluguer:
            tipoAnuncio === TipoAnuncio.ALUGUER ? quantidadeDisponivel : 0,
        quantidadeDisponivel,
    };
}

/*
    Obtém o primeiro registo de stock associado ao artigo.

    Atualmente, o Marketplace trabalha com o stock principal do artigo.
*/
export function obterStockPrincipal(
    artigo: ArtigoComBase,
): StockPrincipalMarketplace | null {
    if (!artigo.Stock_Armazem.length) {
        return null;
    }

    return artigo.Stock_Armazem[0];
}

/*
    Calcula a quantidade disponível atual com base no tipo do anúncio.

    Venda:
    - usa Quantidade_Venda

    Aluguer:
    - usa Quantidade_Aluguer

    Ambos:
    - soma venda + aluguer
*/
export function obterQuantidadeDisponivelAtual(
    artigo: ArtigoComBase,
    stockPrincipal: StockPrincipalMarketplace,
): number {
    if (artigo.Tipo_Anuncio === TipoAnuncio.ALUGUER) {
        return stockPrincipal.Quantidade_Aluguer;
    }

    if (artigo.Tipo_Anuncio === TipoAnuncio.AMBOS) {
        return (
            stockPrincipal.Quantidade_Venda +
            stockPrincipal.Quantidade_Aluguer
        );
    }

    return stockPrincipal.Quantidade_Venda;
} 