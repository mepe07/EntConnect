import { authService } from './auth.service';
import type { LinhaFaturacaoCoaching, ResumoFaturacao } from '../models/interfaces/faturacao.interface';
import { API_BASE_URL } from "../../src/config/api.config";

class FaturacaoService {
    private readonly API_URL = `${API_BASE_URL}/faturacao`;

    /**
     * Headers JSON autenticados para os endpoints privados de faturação.
     */
    private getHeaders() {
        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getRelatorio(
        inicio: string,
        fim: string,
    ): Promise<{
        faturas: LinhaFaturacaoCoaching[];
        faturacaoPorEstudio: ResumoFaturacao[];
        faturacaoPorModalidade: ResumoFaturacao[];
        totalAlunos: number;
    }> {
        const urlCompleto = `${this.API_URL}/Relatorio?inicio=${inicio}&fim=${fim}`;

        try {
            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro ao obter relatório de faturação:', erro);
            throw erro;
        }
    }

    // Métodos de faturação de coaching usados nas vistas administrativas.
    async getPagamentosCoaching(filtros: {
        inicio?: string;
        fim?: string;
        professor?: string;
        encarregado?: string;
        estado?: string;
    } = {}): Promise<LinhaFaturacaoCoaching[]> {
        const params = new URLSearchParams();

        Object.entries(filtros).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        const query = params.toString();
        const urlCompleto = `${this.API_URL}/pagamentos-coaching${query ? `?${query}` : ''}`;

        const response = await fetch(urlCompleto, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const erroDoServidor = await response.json().catch(() => null);
            throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
        }

        return await response.json();
    }

    async registarPagamento(idCoaching: number, idAluno: number, valorPago?: number) {
        const response = await fetch(`${this.API_URL}/pagar/${idCoaching}/${idAluno}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(valorPago === undefined ? {} : { valorPago }),
        });

        if (!response.ok) {
            const erroDoServidor = await response.json().catch(() => null);
            throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
        }

        return await response.json();
    }

    async getHistorico(inicio: string, fim: string) {
        const urlCompleto = `${this.API_URL}/Historico?inicio=${inicio}&fim=${fim}`;

        try {
            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro ao obter histórico de faturação:', erro);
            throw erro;
        }
    }

    async getDashboardFinanceiro(inicio: string, fim: string) {
        const urlCompleto = `${this.API_URL}/dashboard-financeiro?inicio=${inicio}&fim=${fim}`;

        try {
            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro ao obter dashboard financeiro:', erro);
            throw erro;
        }
    }

    async getPrevisaoFinanceira() {
        const urlCompleto = `${this.API_URL}/previsao-financeira`;

        try {
            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro ao obter previsão financeira:', erro);
            throw erro;
        }
    }
}

export const faturacaoService = new FaturacaoService();
