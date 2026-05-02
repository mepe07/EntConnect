// Ficheiro: src/marketplace/marketplace.prisma-types.ts

import { Prisma } from '@prisma/client';

/*
    Include base usado nas queries de Artigo do Marketplace.

    Este objeto define quais relações queremos carregar juntamente com o artigo:
    - Stock_Armazem
    - Cor
    - Estado
    - Tamanho
    - Utilizador criador
    - Pessoa do criador
    - Utilizador moderador
    - Pessoa do moderador

    Ao usar `satisfies Prisma.ArtigoInclude`, o TypeScript valida se estas relações
    existem mesmo no schema Prisma.
*/
export const INCLUDE_BASE_ARTIGO = {
    Stock_Armazem: {
        include: {
            Cor: true,
            Estado: true,
            Tamanho: true,
        },
    },
    Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador: {
        include: {
            Pessoa: true,
        },
    },
    Utilizador_Artigo_ID_Utilizador_ModeradorToUtilizador: {
        include: {
            Pessoa: true,
        },
    },
} satisfies Prisma.ArtigoInclude;

/*
    Tipo de um artigo carregado com o INCLUDE_BASE_ARTIGO.

    Isto evita usarmos `any` em métodos privados que precisam de aceder a:
    - artigo.Stock_Armazem
    - artigo.Utilizador_...
    - artigo.Pessoa
*/
export type ArtigoComBase = Prisma.ArtigoGetPayload<{
    include: typeof INCLUDE_BASE_ARTIGO;
}>;

/*
    Tipo de um item dentro da lista Stock_Armazem do artigo.
*/
export type StockPrincipalMarketplace = ArtigoComBase['Stock_Armazem'][number];