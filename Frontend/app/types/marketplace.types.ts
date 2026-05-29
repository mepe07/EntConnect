

export type AcaoModeracao = 'remover' | 'reativar' | 'arquivar' | 'moderacao';
export type TipoAnuncioLegado = TipoAnuncio | 'ambos';

export enum TipoAnuncio {
    VENDA = 'venda',
    ALUGUER = 'aluguer',
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
    Contacto?: string;
    Telefone?: string;
    Telemovel?: string;
    Mail?: string;
    Email?: string;
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
    Tipo_Anuncio: TipoAnuncioLegado;
    Aluguer_Continuo?: boolean;
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
    Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador?: UtilizadorResumo;
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

export type EstadoCalendarioAnuncio =
    | 'ocupado'
    | 'reservado'
    | 'alugado'
    | 'devolucao_pendente';

export interface CalendarioAnuncioItem {
    idAluguer?: number;
    dataInicio: string;
    dataFim: string;
    estado: EstadoCalendarioAnuncio;
    nomePessoa?: string | null;
    contacto?: string | null;
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
    aluguerContinuo?: boolean;
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
    quantidadeDisponivel?: number;
    quantidadeVenda?: number;
    quantidadeAluguer?: number;
    aluguerContinuo?: boolean;
}

export interface RegistarInteressePayload {
    tipo?: TipoInteresse;
    mensagem?: string;
    dataRecolhaPrevista?: string;
}

export interface CriarPedidoAluguerPayload {
    dataInicio: string;
    dataFim: string;
    mensagem?: string;
}

export interface CriarItemInventarioPayload {
    titulo: string;
    descricao?: string;
    foto?: string;
    ficheiroFoto?: File;
    idCor?: number;
    idEstado?: number;
    idTamanho?: number;
    quantidade: number;
}

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


export type TipoRegistoMeuAluguer = 'pedido' | 'aluguer';
export type PapelMeuAluguer = 'interessado' | 'dono';
export type EstadoMeuAluguer =
    | 'pendente'
    | 'reservado'
    | 'ativo'
    | 'devolucao_pendente'
    | 'concluido'
    | 'cancelado'
    | 'rejeitado';

export interface MeuAluguer {
    id: number | string;
    tipoRegisto: TipoRegistoMeuAluguer;
    idAluguer?: number | null;
    idPedido?: number | null;
    idAnuncio: number;
    artigo: string;
    categoria?: string | null;
    foto?: string | null;
    estado: EstadoMeuAluguer;
    papel: PapelMeuAluguer;
    inicio: string;
    fim: string;
    outraPessoa?: string | null;
    contactoOutraPessoa?: string | null;
    origem?: string | null;
    aluguerContinuo?: boolean;
    podeAceitar?: boolean;
    podeRejeitar?: boolean;
    podeMarcarComoDevolvido?: boolean;
    podeConfirmarDevolucao?: boolean;
    podeCancelar?: boolean;
    podeVerAnuncio?: boolean;
}
