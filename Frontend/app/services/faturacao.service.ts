

import { authService } from './auth.service';

import { API_BASE_URL } from "../../src/config/api.config";

class FaturacaoService {


    private readonly API_URL = `${API_BASE_URL}/faturacao`;

    async getRelatorio(inicio: string, fim: string) {


        const urlCompleto = `${this.API_URL}/Relatorio?inicio=${inicio}&fim=${fim}`;

        console.log("A pedir dados a:", urlCompleto);

        const token = authService.getToken();

        try {
            const response = await fetch(urlCompleto, {

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {

                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();

        } catch (erro) {
            console.error("O Estafeta caiu da mota:", erro);
            throw erro;
        }
    }


    async getHistorico(inicio: string, fim: string) {
        const urlCompleto = `${this.API_URL}/Historico?inicio=${inicio}&fim=${fim}`;

        console.log("A pedir histórico a:", urlCompleto);

        try {
            const response = await fetch(urlCompleto);

            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();

        } catch (erro) {
            console.error("O Estafeta do histórico caiu da mota:", erro);
            throw erro;
        }
    }
    async getDashboardFinanceiro(inicio: string, fim: string) {
        const urlCompleto = `${this.API_URL}/dashboard-financeiro?inicio=${inicio}&fim=${fim}`;
        console.log("A pedir estatísticas a:", urlCompleto);


        const token = authService.getToken();

        try {

            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: {

                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {

                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (erro) {
            console.error("O Estafeta das estatísticas caiu da mota:", erro);
            throw erro;
        }
    }

    async getPrevisaoFinanceira() {
        const urlCompleto = `${this.API_URL}/previsao-financeira`;
        console.log("A pedir a bola de cristal a:", urlCompleto);

        try {
            const response = await fetch(urlCompleto);
            if (!response.ok) {
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }
            return await response.json();
        } catch (erro) {
            console.error("A bola de cristal do estafeta partiu-se:", erro);
            throw erro;
        }
    }
}

export const faturacaoService = new FaturacaoService();