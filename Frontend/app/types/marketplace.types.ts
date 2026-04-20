// Ficheiro: Frontend/app/types/marketplace.types.ts

export enum TipoAnuncio {
    VENDA = 'venda',
    ALUGUER = 'aluguer',
    AMBOS = 'ambos',
}

export enum EstadoAnuncio {
    ATIVO = 'ativo',
    RESERVADO = 'reservado',
    CONCLUIDO = 'concluido',
    ARQUIVADO = 'arquivado',
    REMOVIDO = 'removido',
}

export enum OrigemRegisto {
    UTILIZADOR = 'utilizador',
    INVENTARIO_ESCOLA = 'inventario_escola',
}

export enum TipoInteresse {
    CONTACTO = 'Contacto',
    COMPRA = 'Compra',
    ALUGUER = 'Aluguer',
}

export interface PessoaResumo {
    ID_Pessoa: number;
    Nome: string;
    Contato?: string;
    Mail?: string;
}

export interface UtilizadorResumo {
    ID_Utilizador: number;
    Pessoa?: PessoaResumo;
}

export interface CorResumo {
    ID_Cor: number;
    Descricao: string;
}

export interface EstadoPecaResumo {
    ID_Estado: number;
    Descricao: string;
}

export interface TamanhoResumo {
    ID_Tamanho: number;
    Descricao: string;
}

export interface StockArmazem {
    ID_Stock: number;
    Quantidade_Total: number;
    Quantidade_Venda: number;
    Quantidade_Aluguer: number;
    Cor?: CorResumo;
    Estado?: EstadoPecaResumo;
    Tamanho?: TamanhoResumo;
}

export interface Anuncio {
    ID_Artigo: number;
    Nome: string;
    Descricao?: string;
    Notas?: string;
    Foto?: string;
    Tipo_Anuncio: TipoAnuncio;
    Estado_Anuncio: EstadoAnuncio;
    Origem_Registo: OrigemRegisto;
    Publicado_No_Marketplace: boolean;
    ID_Utilizador_Criador?: number;
    ID_Utilizador_Moderador?: number;
    Motivo_Moderacao?: string | null;
    Data_Criacao?: string;
    Data_Atualizacao?: string;
    Utilizador_Criador?: UtilizadorResumo;
    Utilizador_Moderador?: UtilizadorResumo;
    Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador?: UtilizadorResumo; // legado Prisma
    Stock_Armazem?: StockArmazem[];
}

export interface Proposta {
    ID_Interesse: number;
    Data_Registo: string;
    Estado: string;
    Mensagem?: string;
    Tipo: TipoInteresse;
    Data_Recolha_Prevista?: string;
    Utilizador?: UtilizadorResumo;
    Stock_Armazem?: StockArmazem;
}

export interface FiltrosAnuncios {
    pesquisa?: string;
    tipoAnuncio?: TipoAnuncio;
    estado?: EstadoAnuncio;
    origem?: OrigemRegisto;
    idCriador?: number;
    publicado?: boolean;
}

export interface CriarAnuncioPayload {
    titulo: string;
    descricao?: string;
    foto?: string;
    ficheiroFoto?: File;
    tipoAnuncio: TipoAnuncio;
    quantidadeTotal: number;
    quantidadeDisponivel?: number;
    quantidadeVenda?: number;
    quantidadeAluguer?: number;
    notasInternas?: string;
    idCor?: number;
    idEstado?: number;
    idTamanho?: number;
}

export interface PublicarInventarioEscolaPayload {
    idArtigo: number;
    titulo?: string;
    descricao?: string;
    foto?: string;
    tipoAnuncio: TipoAnuncio;
    quantidadeDisponivel?: number; // legado: manter temporariamente para compatibilidade
    quantidadeVenda?: number;
    quantidadeAluguer?: number;
}

export interface RegistarInteressePayload {
    tipo?: TipoInteresse;
    mensagem?: string;
    dataRecolhaPrevista?: string;
}

export interface CriarItemInventarioPayload {
    titulo: string;
    descricao?: string;
    quantidadeVenda: number;
    quantidadeAluguer: number;
    foto?: string; // Mantemos como string para quando a imagem já vem da BD (URL)
    ficheiroFoto?: File;
    idCor?: number;
    quantidade: number;
}
