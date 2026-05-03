/**
 * Tipos de evento suportados pelo frontend e pelo backend.
 */
export type TipoEvento =
    | 'evento'
    | 'workshop'
    | 'concerto'
    | 'audicao'
    | 'aviso'
    | 'outro';

/**
 * Estrutura resumida de um evento usada em listagens e destaques.
 */
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

/**
 * Estrutura completa de um evento usada em detalhe e gestão.
 */
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

/**
 * Estados de filtro disponíveis na gestão interna de eventos.
 */
export type FiltroEstadoEventoGestao = 'todos' | 'ativos' | 'removidos';

/**
 * Filtros usados na listagem interna de eventos.
 */
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

/**
 * Payload usado para criar ou atualizar eventos no frontend.
 */
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
