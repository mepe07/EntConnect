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

export const INCLUDE_PEDIDO_ALUGUER = {
  Stock_Armazem: {
    include: {
      Artigo: {
        include: INCLUDE_BASE_ARTIGO,
      },
    },
  },
  Utilizador: {
    include: {
      Pessoa: true,
    },
  },
} satisfies Prisma.Interesse_ArtigoInclude;

export type PedidoAluguerComDetalhe = Prisma.Interesse_ArtigoGetPayload<{
  include: typeof INCLUDE_PEDIDO_ALUGUER;
}>;

export const INCLUDE_ALUGUER_ARTIGO = {
  Stock_Armazem: {
    include: {
      Artigo: {
        include: INCLUDE_BASE_ARTIGO,
      },
    },
  },
  Utilizador: {
    include: {
      Pessoa: true,
    },
  },
} satisfies Prisma.Aluguer_ArtigoInclude;

export type AluguerArtigoComDetalhe = Prisma.Aluguer_ArtigoGetPayload<{
  include: typeof INCLUDE_ALUGUER_ARTIGO;
}>;
