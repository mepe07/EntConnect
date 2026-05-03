import { Prisma } from '@prisma/client';

/**
 * Include base reutilizado nas queries Prisma do Marketplace.
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

/**
 * Tipo de artigo carregado com as relações base do Marketplace.
 */
export type ArtigoComBase = Prisma.ArtigoGetPayload<{
    include: typeof INCLUDE_BASE_ARTIGO;
}>;

/**
 * Tipo do registo principal de stock associado a um artigo.
 */
export type StockPrincipalMarketplace = ArtigoComBase['Stock_Armazem'][number];
