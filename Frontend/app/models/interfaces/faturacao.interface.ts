export interface LinhaFaturacaoCoaching {
    idCoaching: number;         
    dataAula: string;           
    

    nomeProfessor: string;      // quem foi o professor
    nomeAluno: string;          // quem foi o Aluno
    

    valorTotal: number;         // montante total da aula (ValorHora * Duracao)
    estaPago: boolean;          // estado do pagamento (true se pago, false se não pago)

    fotoProfessorUrl?: string;  // URL da foto do professor (opcional)
    
    duracaoMinutos: number;     // Duracao
    salaNome?: string;          // nome da sala onde a aula ocorreu
}

// 2. O CONTRATO DO FILTRO (Para o teu seletor de datas)
// Isto serve para tiparmos a caixinha onde a coordenadora escolhe as datas
export interface FiltroFaturacao {
    dataInicio: string; // data de início do filtro (formato: "YYYY-MM-DD")
    dataFim: string; // data de fim do filtro (formato: "YYYY-MM-DD")
}