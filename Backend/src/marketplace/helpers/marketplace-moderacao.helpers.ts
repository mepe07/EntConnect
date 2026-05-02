// Ficheiro: src/marketplace/marketplace-moderacao.helpers.ts

import { BadRequestException } from '@nestjs/common';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/*
    Parâmetros necessários para calcular o resultado de uma ação de moderação.

    Esta função não mexe na BD.
    Só decide qual deve ser o novo estado do anúncio.
*/
interface CalcularResultadoModeracaoParams {
    acao: AcaoModeracao;
    estadoAtual: EstadoAnuncio | string;
    motivoPedido?: string | null;
    motivoAtual?: string | null;
}

/*
    Resultado final que o MarketplaceService vai usar para atualizar o artigo.
*/
interface ResultadoModeracao {
    estadoNovo: EstadoAnuncio;
    publicadoNoMarketplace: boolean;
    motivoFinal: string | null;
}

/*
    Calcula o resultado de uma ação de moderação.

    Regras:
    - remover:
      anúncio não pode já estar removido;
      passa para removido;
      deixa de estar publicado.

    - reativar:
      só anúncios removidos podem ser reativados;
      passa para ativo;
      volta a estar publicado.

    - arquivar:
      anúncio não pode já estar arquivado;
      passa para arquivado;
      deixa de estar publicado.
*/
export function calcularResultadoModeracao(
    params: CalcularResultadoModeracaoParams,
): ResultadoModeracao {
    const {
        acao,
        estadoAtual,
        motivoPedido,
        motivoAtual,
    } = params;

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