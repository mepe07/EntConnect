import { BadRequestException } from '@nestjs/common';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/**
 * Parâmetros usados no cálculo do resultado de uma ação de moderação.
 */
interface CalcularResultadoModeracaoParams {
    acao: AcaoModeracao;
    estadoAtual: EstadoAnuncio | string;
    motivoPedido?: string | null;
    motivoAtual?: string | null;
}

/**
 * Resultado final usado para atualizar o anúncio após moderação.
 */
interface ResultadoModeracao {
    estadoNovo: EstadoAnuncio;
    publicadoNoMarketplace: boolean;
    motivoFinal: string | null;
}

/**
 * Calcula o novo estado de um anúncio após uma ação de moderação.
 *
 * @param params - Estado atual, ação pedida e motivo opcional.
 * @returns Resultado final a persistir no anúncio.
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
