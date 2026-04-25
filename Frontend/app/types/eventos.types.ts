// Ficheiro: Frontend/app/types/eventos.types.ts

// Tipos permitidos para eventos.
// Têm de bater certo com os valores que existem no backend/SQL.
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