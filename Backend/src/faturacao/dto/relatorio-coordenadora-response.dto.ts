export class RelatorioCoordenadoraResponseDto {
    idCoaching: number;
    dataAula: Date;
    nomeProfessor: string;
    fotoProfessorUrl?: string;
    nomeAluno: string;
    valorTotal: number;
    estaPago: boolean;
    duracaoMinutos: number;
    salaNome?: string;
} 