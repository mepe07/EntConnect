// Ficheiro: src/marketplace/helpers/marketplace-stock.helpers.ts

import { BadRequestException } from '@nestjs/common';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';
import {
    type ArtigoComBase,
    type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

/*
    Marketplace Stock Helper

    Este helper centraliza as regras relacionadas com stock do Marketplace.

    Responsabilidades:
    - validar quantidades;
    - calcular distribuição entre venda e aluguer;
    - derivar o tipo real do anúncio com base nessa distribuição;
    - obter o stock principal de um artigo;
    - calcular a quantidade disponível atual.

    Mantemos esta lógica fora do MarketplaceService para que o service fique
    focado nos fluxos principais e não nos detalhes matemáticos de stock.
*/

/*
    Parâmetros necessários para resolver a distribuição de stock.

    O Marketplace permite dois modos:

    1. Quantidade disponível simples:
       - usada quando o anúncio é apenas venda ou apenas aluguer.

    2. Distribuição explícita:
       - usada quando existe quantidade separada para venda e aluguer.

    Os campos quantidadeVendaAtual e quantidadeAluguerAtual são usados na edição,
    quando o utilizador não envia nova distribuição e queremos manter a atual.
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

    Este resultado é usado pelo service e pelo mapper para atualizar:
    - tipo do anúncio;
    - quantidade para venda;
    - quantidade para aluguer;
    - quantidade total disponível no Marketplace.
*/
interface DistribuicaoStockResultado {
    tipoAnuncio: TipoAnuncio;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    quantidadeDisponivel: number;
}

/*
    Valida se a quantidade disponível não ultrapassa a quantidade total.

    Exemplo inválido:
    - quantidade total: 5;
    - quantidade disponível: 8.

    Isto evita publicar mais unidades do que existem em stock.
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
    Deriva automaticamente o tipo real do anúncio com base nas quantidades.

    Regras:
    - se houver venda e aluguer, o tipo passa a AMBOS;
    - se houver apenas aluguer, o tipo passa a ALUGUER;
    - nos restantes casos, o tipo passa a VENDA.

    Isto garante que o tipo do anúncio fica coerente com a distribuição real.
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

    Esta função é usada em três fluxos principais:
    - criação de anúncio;
    - edição de anúncio;
    - publicação de item do inventário da escola.

    A função decide como dividir o stock entre venda e aluguer,
    garantindo sempre que a quantidade disponível não ultrapassa a quantidade total.

    Casos tratados:
    1. Recebe quantidadeVenda e/ou quantidadeAluguer:
       usa distribuição explícita.

    2. Não recebe distribuição, mas pode manter a atual:
       reaproveita quantidadeVendaAtual + quantidadeAluguerAtual.

    3. Recebe apenas quantidadeDisponivel:
       distribui tudo para venda ou aluguer, conforme o tipoAnuncio.

    4. tipoAnuncio = AMBOS sem quantidades separadas:
       lança erro, porque "ambos" exige divisão explícita.
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
    Obtém o stock principal associado a um artigo.

    Atualmente o Marketplace trabalha com o primeiro registo de Stock_Armazem
    associado ao artigo.

    Se no futuro existirem vários stocks por localização, lote ou escola,
    esta função será o ponto ideal para evoluir essa regra.
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
    Calcula a quantidade atualmente disponível no Marketplace.

    A quantidade depende do tipo do anúncio:
    - VENDA: usa Quantidade_Venda;
    - ALUGUER: usa Quantidade_Aluguer;
    - AMBOS: soma venda e aluguer.

    Esta função evita repetir a mesma regra sempre que precisamos de calcular
    a disponibilidade real de um artigo.
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