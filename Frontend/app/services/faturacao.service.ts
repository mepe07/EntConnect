// Ficheiro: app/services/faturacao.service.ts

import { authService } from './auth.service';
import type { LinhaFaturacaoCoaching } from '../models/interfaces/faturacao.interface';

import { API_BASE_URL } from "../../src/config/api.config";

class FaturacaoService {
    // URL base das rotas de faturação.
    // A origem da API vem do .env do frontend através de VITE_API_URL.
    private readonly API_URL = `${API_BASE_URL}/faturacao`;

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

    // Metodos de faturacao de coaching usados nas vistas administrativas.
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
        const token = authService.getToken();

        const response = await fetch(urlCompleto, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            const erroDoServidor = await response.json().catch(() => null);
            throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
        }

        return await response.json();
    }

    async registarPagamento(idCoaching: number, idAluno: number, valorPago?: number) {
        const token = authService.getToken();

        const response = await fetch(`${this.API_URL}/pagar/${idCoaching}/${idAluno}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
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

        // 1. Ir buscar o token (A nossa prova de identidade)
        const token = authService.getToken();

        try {
            // 2. ENVIAR O TOKEN: Precisamos de passar o objeto de configuração
            const response = await fetch(urlCompleto, {
                method: 'GET',
                headers: {
                    // Aqui dizemos ao servidor quem somos
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Se o servidor responder 401, a mensagem "Token não encontrado na mochila" aparecerá aqui
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
