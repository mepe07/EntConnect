/**
 * Define a estrutura do payload devolvido pelo endpoint do Dashboard Financeiro (Dados Históricos).
 */
export interface DadosDashboard {
    resumoGeral: { 
        totalPago: number; 
        totalEmDivida: number; 
    };
    evolucaoFinanceira: { 
        data: string; 
        faturado: number; 
    }[];
    topProfessores: { 
        nome: string; 
        total: number; 
    }[];
}

/**
 * Define a estrutura dos dados para a previsão financeira dos próximos meses.
 */
export interface DadosPrevisao {
    mes: string;
    previsto: number;
}