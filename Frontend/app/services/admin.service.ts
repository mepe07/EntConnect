import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

export class AdminService {
    // URL base da API.
    // Vem do ficheiro .env do frontend através de VITE_API_URL.
    private _apiUrl = API_BASE_URL;

    /**
     * Função auxiliar para gerar os headers comuns, incluindo o Token de segurança.
     */
    private getHeaders() {
        // Exemplo: Buscar o token ao localStorage ou ao teu AuthService
        const token = authService.getToken(); 
        
        return {
            'Content-Type': 'application/json',
            // Só adiciona o Authorization se o token existir
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
        };
    }

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
}