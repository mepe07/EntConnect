/**
 * Ações de moderação disponíveis no Marketplace.
 */
export type AcaoModeracao = 'remover' | 'reativar' | 'arquivar' | 'moderacao';

/**
 * Tipos de anúncio suportados pelo Marketplace.
 */
export enum TipoAnuncio {
    VENDA = 'venda',
    ALUGUER = 'aluguer',
    AMBOS = 'ambos',
}

/**
 * Estados possíveis de um anúncio.
 */
export enum EstadoAnuncio {
    ATIVO = 'ativo',
    RESERVADO = 'reservado',
    CONCLUIDO = 'concluido',
    ARQUIVADO = 'arquivado',
    REMOVIDO = 'removido',
}

/**
 * Origem de um artigo apresentado no Marketplace.
 */
export enum OrigemRegisto {
    UTILIZADOR = 'utilizador',
    INVENTARIO_ESCOLA = 'inventario_escola',
}

/**
 * Tipos de interesse que um utilizador pode registar num anúncio.
 */
export enum TipoInteresse {
    CONTACTO = 'Contacto',
    COMPRA = 'Compra',
    ALUGUER = 'Aluguer',
}

/**
 * Resumo de pessoa usado nas relações do Marketplace.
 */
export interface PessoaResumo {
    ID_Pessoa: number;
    Nome: string;
    Contato?: string;
    Mail?: string;
}

/**
 * Resumo de utilizador usado nas relações do Marketplace.
 */
export interface UtilizadorResumo {
    ID_Utilizador: number;
    Pessoa?: PessoaResumo;
}

/**
 * Resumo de cor de peça.
 */
export interface CorResumo {
    ID_Cor: number;
    Descricao: string;
}

/**
 * Resumo do estado físico de uma peça.
 */
export interface EstadoPecaResumo {
    ID_Estado: number;
    Descricao: string;
}

/**
 * Resumo do tamanho de uma peça.
 */
export interface TamanhoResumo {
    ID_Tamanho: number;
    Descricao: string;
}

/**
 * Registo de stock associado a um artigo.
 */
export interface StockArmazem {
    ID_Stock: number;
    Quantidade_Total: number;
    Quantidade_Venda: number;
    Quantidade_Aluguer: number;
    Cor?: CorResumo;
    Estado?: EstadoPecaResumo;
    Tamanho?: TamanhoResumo;
}

/**
 * Estrutura principal de anúncio usada no frontend.
 */
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

/**
 * Interesse ou proposta registada sobre um anúncio.
 */
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

/**
 * Filtros usados na listagem de anúncios.
 */
export interface FiltrosAnuncios {
    pesquisa?: string;
    tipoAnuncio?: TipoAnuncio;
    estado?: EstadoAnuncio;
    origem?: OrigemRegisto;
    idCriador?: number;
    publicado?: boolean;
}

/**
 * Payload usado para criar anúncios no Marketplace.
 */
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

/**
 * Payload usado para publicar artigos do inventário da escola.
 */
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

/**
 * Payload usado para registar interesse num anúncio.
 */
export interface RegistarInteressePayload {
    tipo?: TipoInteresse;
    mensagem?: string;
    dataRecolhaPrevista?: string;
}

/**
 * Payload usado para criar itens no inventário interno.
 */
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

/**
 * Estrutura de registo de moderação devolvida pelo backend.
 */
export interface RegistoModeracaoMarketplace {
    ID_Registo_Moderacao: number;
    ID_Artigo: number;
    ID_Utilizador_Moderador: number;
    Acao: AcaoModeracao | string;
    Estado_Anterior?: EstadoAnuncio | string | null;
    Estado_Novo: EstadoAnuncio | string;
    Motivo?: string | null;
    Data_Registo: string;

    Artigo?: Pick<
        Anuncio,
        'ID_Artigo' | 'Nome' | 'Foto' | 'Tipo_Anuncio' | 'Estado_Anuncio' | 'Origem_Registo'
    >;

    Utilizador?: UtilizadorResumo;
    Utilizador_Moderador?: UtilizadorResumo;
}
