// Ficheiro: src/marketplace/enums/acao-moderacao.enum.ts

/*
    AcaoModeracao

    Define as ações que a moderação pode aplicar sobre um anúncio.

    Este enum é usado no fluxo de moderação para garantir que apenas ações
    válidas são aceites pela API.

    A ação recebida no DTO é validada com @IsEnum(AcaoModeracao).
    Depois, o helper de moderação calcula o novo estado do anúncio com base
    nesta ação.
*/
export enum AcaoModeracao {
    // Remove logicamente o anúncio do Marketplace.
    REMOVER = 'remover',

    // Reativa um anúncio anteriormente removido.
    REATIVAR = 'reativar',

    // Arquiva o anúncio, mantendo histórico mas retirando-o da listagem ativa.
    ARQUIVAR = 'arquivar',
} 