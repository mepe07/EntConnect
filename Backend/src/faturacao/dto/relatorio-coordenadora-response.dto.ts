/**
 * DTO de resposta usado no relatório de faturação da coordenação.
 */
export class RelatorioCoordenadoraResponseDto {
    idCoaching!: number;
    dataAula!: Date;
    nomeProfessor!: string;
    fotoProfessorUrl?: string;
    nomeAluno!: string;
    valorTotal!: number;
    duracaoMinutos!: number;
    salaNome?: string;
} 
