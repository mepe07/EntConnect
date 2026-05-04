/**
 * DTO usado para transportar os dados de Relatorio Coordenadora Response.
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
