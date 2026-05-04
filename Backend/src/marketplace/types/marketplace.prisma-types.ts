import { Prisma } from '@prisma/client';

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

export type ArtigoComBase = Prisma.ArtigoGetPayload<{
  include: typeof INCLUDE_BASE_ARTIGO;
}>;

export type StockPrincipalMarketplace = ArtigoComBase['Stock_Armazem'][number];
