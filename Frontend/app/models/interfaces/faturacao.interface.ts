export interface LinhaFaturacaoCoaching {
    idCoaching: number;
    idAluno?: number;

    dataAula: string;

    nomeProfessor: string;
    emailProfessor?: string | null;
    nomeAluno: string;
    nomeEncarregado?: string;
    emailEncarregado?: string | null;
    contactoEncarregado?: string | null;


    valorTotal: number;

    valorPago?: number;

    valorEmFalta?: number;


    estaPago: boolean;
    estadoPagamento?: 'atrasado' | 'pendente' | 'pago';
    estadoCoaching?: string;

    fotoProfessorUrl?: string;

    duracaoMinutos: number;
    salaNome?: string;
}

export interface ResumoFaturacao {
    nome: string;
    totalFaturado: number;
    totalPago: number;
    totalEmDivida: number;
    aulas: number;
    alunos: number;
}

export interface FiltroFaturacao {
    dataInicio: string;
    dataFim: string;
}
