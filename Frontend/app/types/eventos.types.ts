


export type TipoEvento =
    | 'evento'
    | 'workshop'
    | 'concerto'
    | 'audicao'
    | 'aviso'
    | 'outro';

export interface EventoResumo {
    id: number;
    titulo: string;
    slug: string;
    resumo?: string | null;
    tipo: TipoEvento;
    local?: string | null;
    imagem?: string | null;
    dataInicio: string;
    dataFim?: string | null;
}

export interface Evento extends EventoResumo {
    descricao?: string | null;
    publico: boolean;
    publicado: boolean;
    destaque: boolean;
    destaqueLogin: boolean;
    ativo: boolean;
    idUtilizadorCriador: number;
    idUtilizadorAtualizacao?: number | null;
    idUtilizadorRemocao?: number | null;
    dataCriacao: string;
    dataAtualizacao: string;
    dataRemocao?: string | null;
}

export type FiltroEstadoEventoGestao = 'todos' | 'ativos' | 'removidos';

export interface FiltrosGestaoEventos {
    pesquisa?: string;
    tipo?: TipoEvento | 'todos';
    ativo?: boolean;
    publico?: boolean;
    publicado?: boolean;
    destaque?: boolean;
    destaqueLogin?: boolean;
    limite?: number;
}

export interface GuardarEventoPayload {
    titulo: string;
    slug?: string;
    resumo?: string;
    descricao?: string;
    tipo: TipoEvento;
    local?: string;
    dataInicio: string;
    dataFim?: string;
    publico: boolean;
    publicado: boolean;
    destaque: boolean;
    destaqueLogin: boolean;
    ficheiroImagem?: File | null;
}