/**
 * Linha de faturação de coaching apresentada no frontend.
 */
export interface LinhaFaturacaoCoaching {
    idCoaching: number;
    idAluno?: number;

    dataAula: string;

    nomeProfessor: string;
    nomeAluno: string;

    valorTotal: number;

    valorEmFalta?: number;

    estaPago: boolean;

    fotoProfessorUrl?: string;

    duracaoMinutos: number;
    salaNome?: string;
}

/**
 * Filtro temporal usado no relatório de faturação.
 */
export interface FiltroFaturacao {
    dataInicio: string;
    dataFim: string;
}
