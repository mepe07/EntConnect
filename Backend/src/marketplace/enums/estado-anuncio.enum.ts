// Ficheiro: src/marketplace/enums/estado-anuncio.enum.ts

/*
    EstadoAnuncio

    Representa o estado atual de um anúncio no Marketplace.

    Este enum é importante porque controla:
    - se o anúncio aparece publicamente;
    - se pode receber novos interesses;
    - se pode ser moderado;
    - se pode ser reativado;
    - se fica apenas guardado para histórico.

    A regra de transição entre estados fica no MarketplaceService e nos helpers
    de moderação. O enum apenas define os estados válidos.
*/
export enum EstadoAnuncio {
    // Anúncio visível e disponível no Marketplace.
    ATIVO = 'ativo',

    // Anúncio temporariamente reservado para um interessado.
    RESERVADO = 'reservado',

    // Anúncio concluído, por exemplo após venda, aluguer ou entrega.
    CONCLUIDO = 'concluido',

    // Anúncio arquivado, mantendo histórico mas sem exposição ativa.
    ARQUIVADO = 'arquivado',

    // Anúncio removido logicamente, sem apagar o registo da base de dados.
    REMOVIDO = 'removido',
} 