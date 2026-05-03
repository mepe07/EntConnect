// Ficheiro: src/marketplace/enums/tipo-anuncio.enum.ts

/*
    TipoAnuncio

    Define de que forma um artigo pode ser disponibilizado no Marketplace.

    Este enum é usado em:
    - criação de anúncios;
    - publicação de itens do inventário;
    - atualização de anúncios;
    - filtros de listagem;
    - regras de distribuição de stock.

    Ao usar enum em vez de strings soltas, evitamos valores inválidos como:
    "comprar", "emprestar", "teste", etc.
*/
export enum TipoAnuncio {
    // O artigo está disponível apenas para venda.
    VENDA = 'venda',

    // O artigo está disponível apenas para aluguer.
    ALUGUER = 'aluguer',

    // O artigo pode ser disponibilizado simultaneamente para venda e aluguer.
    AMBOS = 'ambos',
} 