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

    // Valor ja pago.
    valorPago?: number;

    // Valor que ainda falta pagar.

    valorEmFalta?: number;


    estaPago: boolean;
    estadoPagamento?: 'atrasado' | 'pendente' | 'pago';
    estadoCoaching?: string;

    fotoProfessorUrl?: string;

    duracaoMinutos: number;
    salaNome?: string;
}

export interface FiltroFaturacao {
    dataInicio: string;
    dataFim: string;
}
