// Ficheiro: src/models/interfaces/artigo.interface.ts

export interface LoteStock {
    ID_Stock: number;
    Quantidade_Total: number;
    Quantidade_Venda: number;
    Quantidade_Aluguer: number;
    Cor?: { Descricao: string };
    Estado?: { Descricao: string };
    Tamanho?: { Descricao: string };
}

export interface Artigo {
    ID_Artigo: number;
    Nome: string;
    Notas: string | null;
    Foto?: string | null; 
    Stock_Armazem: LoteStock[];
}


export interface LoteMarketplace {
    ID_Stock: number;
    Quantidade_Venda: number;
    Quantidade_Aluguer: number;
    Cor?: { Descricao: string };
    Estado?: { Descricao: string };
    Tamanho?: { Descricao: string };
    Artigo: {
        ID_Artigo: number;
        Nome: string;
        Notas: string | null;
        Foto: string | null;
    };
}