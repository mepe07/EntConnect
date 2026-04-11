// Ficheiro: app/services/faturacao.service.ts

import { authService } from './auth.service';

class FaturacaoService {
    // 1. A MORADA COMPLETA: Dizemos explicitamente onde mora o NestJS
    // Nota: Removi o '/api' porque o teu NestJS (no main.ts) não tem prefixo global.
    private readonly API_URL = 'http://localhost:3000/faturacao';

    async getRelatorio(inicio: string, fim: string) {
        
        // 2. O CAMINHO EXATO: Usamos 'Relatorio' com R maiúsculo, igual ao Controller do NestJS!
        const urlCompleto = `${this.API_URL}/Relatorio?inicio=${inicio}&fim=${fim}`;
        
        console.log("A pedir dados a:", urlCompleto); // Este log vai ajudar-te a ver o URL final no F12

        const token = authService.getToken();

        try {
            const response = await fetch(urlCompleto, {
                // Injetamos a mochila segura (Headers) no pedido
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            if (!response.ok) {
                // Se o NestJS devolver um Erro 400 (BadRequest), tentamos ler a mensagem
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
            
        } catch (erro) {
            console.error("O Estafeta caiu da mota:", erro);
            throw erro; // Passamos o erro para a página de faturacao.tsx lidar com ele
        }
    }

    // NOVO MÉTODO: O Estafeta para o Histórico de Coaching
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
        // Aponta exatamente para o nome da rota que criámos no faturacao.controller.ts do NestJS
        const urlCompleto = `${this.API_URL}/dashboard-financeiro?inicio=${inicio}&fim=${fim}`;
        console.log("A pedir estatísticas a:", urlCompleto);

        try {
            const response = await fetch(urlCompleto);
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