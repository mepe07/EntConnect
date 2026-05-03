import { BadRequestException } from '@nestjs/common';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';
import {
    type ArtigoComBase,
    type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

/**
 * Parâmetros aceites no cálculo da distribuição de stock de um anúncio.
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

/**
 * Resultado final da distribuição de stock entre venda e aluguer.
 */
interface DistribuicaoStockResultado {
    tipoAnuncio: TipoAnuncio;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

/**
 * Valida se a quantidade disponível não excede o stock total.
 *
 * @param quantidadeTotal - Quantidade total em inventário.
 * @param quantidadeDisponivel - Quantidade a disponibilizar no Marketplace.
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

/**
 * Deduz o tipo de anúncio a partir da distribuição de stock.
 *
 * @param quantidadeVenda - Quantidade alocada para venda.
 * @param quantidadeAluguer - Quantidade alocada para aluguer.
 * @returns Tipo de anúncio coerente com a distribuição recebida.
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

/**
 * Resolve a distribuição final de stock de um anúncio.
 *
 * @param params - Dados de stock recebidos do pedido atual.
 * @returns Distribuição final validada para venda e aluguer.
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

/**
 * Obtém o stock principal associado a um artigo do Marketplace.
 *
 * @param artigo - Artigo carregado com relações base.
 * @returns Primeiro registo de stock, quando existe.
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
