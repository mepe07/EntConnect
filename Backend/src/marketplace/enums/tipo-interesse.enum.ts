// Ficheiro: src/marketplace/enums/tipo-interesse.enum.ts

/*
    TipoInteresse

    Define o tipo de interesse que um utilizador pode registar num anúncio.

    Este enum ajuda a classificar a intenção do utilizador:
    - contacto genérico;
    - intenção de compra;
    - intenção de aluguer.

    A utilização de enum evita valores livres e mantém os dados consistentes
    na base de dados.
*/
export enum TipoInteresse {
    // Interesse genérico, usado quando o utilizador quer apenas contactar o anunciante.
    CONTACTO = 'Contacto',

    // Interesse específico em comprar o artigo.
    COMPRA = 'Compra',

    // Interesse específico em alugar o artigo.
    ALUGUER = 'Aluguer',
} 