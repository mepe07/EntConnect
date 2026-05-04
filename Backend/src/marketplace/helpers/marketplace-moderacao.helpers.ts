import { BadRequestException } from '@nestjs/common';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

interface CalcularResultadoModeracaoParams {
  acao: AcaoModeracao;
  estadoAtual: EstadoAnuncio | string;
  motivoPedido?: string | null;
  motivoAtual?: string | null;
}

interface ResultadoModeracao {
  estadoNovo: EstadoAnuncio;
  publicadoNoMarketplace: boolean;
  motivoFinal: string | null;
}

/**
 * Executa a operacao calcular resultado moderacao.
 * @param params Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function calcularResultadoModeracao(
  params: CalcularResultadoModeracaoParams,
): ResultadoModeracao {
  const { acao, estadoAtual, motivoPedido, motivoAtual } = params;

  if (acao === AcaoModeracao.REMOVER) {
    if (estadoAtual === EstadoAnuncio.REMOVIDO) {
      throw new BadRequestException('O anúncio já se encontra removido.');
    }

    return {
      estadoNovo: EstadoAnuncio.REMOVIDO,
      publicadoNoMarketplace: false,
      motivoFinal: motivoPedido ?? 'Removido pela moderação.',
    };
  }

  if (acao === AcaoModeracao.REATIVAR) {
    if (estadoAtual !== EstadoAnuncio.REMOVIDO) {
      throw new BadRequestException(
        'Só é possível reativar anúncios que estejam removidos.',
      );
    }

    return {
      estadoNovo: EstadoAnuncio.ATIVO,
      publicadoNoMarketplace: true,
      motivoFinal: motivoPedido ?? motivoAtual ?? null,
    };
  }

  if (estadoAtual === EstadoAnuncio.ARQUIVADO) {
    throw new BadRequestException('O anúncio já se encontra arquivado.');
  }

  return {
    estadoNovo: EstadoAnuncio.ARQUIVADO,
    publicadoNoMarketplace: false,
    motivoFinal: motivoPedido ?? motivoAtual ?? null,
  };
}
