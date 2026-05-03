/**
 * Linha de histórico de coaching apresentada em relatórios.
 */
export interface LinhaHistoricoCoaching {
    idCoaching: number;
    idAluno: number;
    nomeAluno: string;
    nomeProfessor: string;
    nomeSala: string;
    dataAula: string;
    duracaoMinutos: number;
    estadoAula: string;
}
