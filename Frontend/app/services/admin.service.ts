import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

/**
 * Serviço responsável pelas operações administrativas de coaching.
 */
export class AdminService {
    private _apiUrl = API_BASE_URL;

    /**
     * Função auxiliar para gerar os headers comuns, incluindo o Token de segurança.
     */
    private getHeaders() {
        const token = authService.getToken(); 
        
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
        };
    }

    /**
     * Obtém sessões futuras visíveis para a área administrativa.
     *
     * @returns Lista de sessões futuras.
     */
    async getSessoesFuturas(): Promise<any[]> {
        const response = await fetch(`${this._apiUrl}/coaching/admin/sessoes-futuras`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar sessões futuras');
        }

        return response.json();
    }

    /**
     * Obtém os KPIs da área administrativa.
     *
     * @returns KPIs agregados do backend.
     */
    async getKpis(): Promise<{ proximas24h: number; marcadas: number; porValidar: number; realizadasMes: number }> {
        const response = await fetch(`${this._apiUrl}/coaching/admin/kpis`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar KPIs');
        }

        return response.json();
    }

    /**
     * Remove um aluno de uma sessão de coaching.
     *
     * @param idAluno - Identificador do aluno.
     * @param idCoaching - Identificador da sessão.
     * @returns Resposta do backend.
     */
    async removerAluno(idAluno: number, idCoaching: number): Promise<any> {
        const response = await fetch(`${this._apiUrl}/coaching/remover-aluno/${idAluno}/coaching/${idCoaching}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Erro ao remover aluno');
        }

        return response.json();
    }

    /**
     * Obtém detalhe administrativo de um aluno.
     *
     * @param idAluno - Identificador do aluno.
     * @returns Detalhes do aluno.
     */
    async getAlunoDetalhes(idAluno: number): Promise<any> {
        const response = await fetch(`${this._apiUrl}/coaching/aluno/${idAluno}/detalhes`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar detalhes do aluno');
        }

        return response.json();
    }
}
