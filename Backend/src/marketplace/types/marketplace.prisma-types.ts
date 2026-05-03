// Ficheiro: src/marketplace/types/marketplace.prisma-types.ts

import { Prisma } from '@prisma/client';

/*
    Marketplace Prisma Types

    Este ficheiro centraliza tipos e includes Prisma usados pelo módulo Marketplace.

    O objetivo é evitar `any` quando trabalhamos com artigos que trazem relações
    carregadas através de include.

    Sem este ficheiro, métodos que recebem um artigo com relações como
    Stock_Armazem, Cor, Estado, Tamanho e Utilizador teriam tendência a usar `any`.
    Com estes tipos, o TypeScript sabe exatamente que estrutura está disponível.

    Vantagens:
    - melhora o autocomplete;
    - valida nomes de relações em tempo de desenvolvimento;
    - evita erros silenciosos em queries Prisma;
    - facilita manutenção caso o schema.prisma mude.
*/

/*
    Include base usado nas queries de Artigo do Marketplace.

    Este include define as relações que o Marketplace precisa carregar de forma
    consistente sempre que trabalha com um anúncio completo.

    Relações incluídas:
    - Stock_Armazem;
    - Cor;
    - Estado;
    - Tamanho;
    - Utilizador criador;
    - Pessoa do criador;
    - Utilizador moderador;
    - Pessoa do moderador.

    Ao usar `satisfies Prisma.ArtigoInclude`, o TypeScript valida se o objeto
    realmente corresponde a um include válido do modelo Artigo.
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

    Este tipo representa o resultado real das queries que usam o include base.
    Ou seja, não é apenas o modelo Artigo simples; é o Artigo com as relações
    necessárias para o Marketplace.

    É usado em métodos e helpers que precisam aceder a:
    - artigo.Stock_Armazem;
    - dados do criador;
    - dados do moderador;
    - características do stock.
*/
export type ArtigoComBase = Prisma.ArtigoGetPayload<{
    include: typeof INCLUDE_BASE_ARTIGO;
}>;

/*
    Tipo de um item individual dentro da lista Stock_Armazem do artigo.

    Como Stock_Armazem é uma lista, usamos `[number]` para obter o tipo de
    um único elemento dessa lista.

    Este tipo é usado nos helpers de stock e nos mappers que atualizam
    quantidades, cor, tamanho e estado do stock principal.
*/
export type StockPrincipalMarketplace = ArtigoComBase['Stock_Armazem'][number];