export interface LinhaFaturacaoCoaching {
    idCoaching: number;
    idAluno?: number;

    dataAula: string;

    nomeProfessor: string;
    nomeAluno: string;

    // Valor total da aula por aluno.
    valorTotal: number;

    // Valor que ainda falta pagar.
    valorEmFalta?: number;

    // Estado do pagamento.
    estaPago: boolean;

    fotoProfessorUrl?: string;

    duracaoMinutos: number;
    salaNome?: string;
}

export interface FiltroFaturacao {
    dataInicio: string;
    dataFim: string;
}