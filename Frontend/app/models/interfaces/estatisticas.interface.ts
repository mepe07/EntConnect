


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


export interface DadosPrevisao {
    mes: string;
    previsto: number;
}