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

export interface FiltroFaturacao {
    dataInicio: string;
    dataFim: string;
}