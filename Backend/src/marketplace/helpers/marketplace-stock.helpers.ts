import { BadRequestException } from '@nestjs/common';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';
import {
  type ArtigoComBase,
  type StockPrincipalMarketplace,
} from '../types/marketplace.prisma-types';

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

interface DistribuicaoStockResultado {
  tipoAnuncio: TipoAnuncio;
  quantidadeVenda: number;
  quantidadeAluguer: number;
  quantidadeDisponivel: number;
}

/**
 * Executa a operacao validar quantidades.
 * @param quantidadeTotal Dados recebidos para a operacao.
 * @param quantidadeDisponivel Dados recebidos para a operacao.
 * @returns Resultado da operacao.
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
 * Executa a operacao derivar tipo anuncio.
 * @param quantidadeVenda Dados recebidos para a operacao.
 * @param quantidadeAluguer Dados recebidos para a operacao.
 * @returns Resultado da operacao.
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
 * Executa a operacao resolver distribuicao stock.
 * @param params Dados recebidos para a operacao.
 * @returns Resultado da operacao.
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
 * Executa a operacao obter stock principal.
 * @param artigo Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function obterStockPrincipal(
  artigo: ArtigoComBase,
): StockPrincipalMarketplace | null {
  if (!artigo.Stock_Armazem.length) {
    return null;
  }

  return artigo.Stock_Armazem[0];
}

/**
 * Executa a operacao obter quantidade disponivel atual.
 * @param artigo Dados recebidos para a operacao.
 * @param stockPrincipal Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function obterQuantidadeDisponivelAtual(
  artigo: ArtigoComBase,
  stockPrincipal: StockPrincipalMarketplace,
): number {
  if (artigo.Tipo_Anuncio === TipoAnuncio.ALUGUER) {
    return stockPrincipal.Quantidade_Aluguer;
  }

  if (artigo.Tipo_Anuncio === TipoAnuncio.AMBOS) {
    return stockPrincipal.Quantidade_Venda + stockPrincipal.Quantidade_Aluguer;
  }

  return stockPrincipal.Quantidade_Venda;
}
