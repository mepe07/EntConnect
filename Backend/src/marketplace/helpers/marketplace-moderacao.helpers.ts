// Ficheiro: src/marketplace/helpers/marketplace-moderacao.helpers.ts

import { BadRequestException } from '@nestjs/common';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/*
    Marketplace Moderação Helper

    Este helper centraliza a lógica de decisão da moderação.

    O objetivo é separar duas responsabilidades:

    MarketplaceService:
    - valida permissões;
    - procura o artigo;
    - abre a transação;
    - atualiza a base de dados;
    - cria o registo de moderação.

    Este helper:
    - recebe a ação pedida;
    - avalia o estado atual;
    - calcula o novo estado;
    - decide se o anúncio fica publicado;
    - define o motivo final.

    A função não acede à base de dados.
    Isto torna a regra mais fácil de ler, testar e defender.
*/

/*
    Parâmetros necessários para calcular o resultado de uma ação de moderação.

    Estes dados vêm do service:
    - ação pedida no DTO;
    - estado atual do anúncio;
    - motivo enviado pelo moderador;
    - motivo já existente no artigo.
*/
interface CalcularResultadoModeracaoParams {
    acao: AcaoModeracao;
    estadoAtual: EstadoAnuncio | string;
    motivoPedido?: string | null;
    motivoAtual?: string | null;
}

/*
    Resultado da decisão de moderação.

    Este objeto é devolvido ao MarketplaceService para ser usado no update
    do artigo dentro da transação.
*/
interface ResultadoModeracao {
    estadoNovo: EstadoAnuncio;
    publicadoNoMarketplace: boolean;
    motivoFinal: string | null;
}

/*
    Calcula o resultado de uma ação de moderação.

    Regras principais:

    1. REMOVER
       - não permite remover um anúncio que já está removido;
       - altera o estado para REMOVIDO;
       - retira o anúncio da listagem do Marketplace;
       - define um motivo, usando fallback se o moderador não enviar um.

    2. REATIVAR
       - só permite reativar anúncios removidos;
       - altera o estado para ATIVO;
       - volta a publicar o anúncio no Marketplace;
       - mantém o motivo existente se não vier novo motivo.

    3. ARQUIVAR
       - não permite arquivar um anúncio que já está arquivado;
       - altera o estado para ARQUIVADO;
       - retira o anúncio da listagem ativa.
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