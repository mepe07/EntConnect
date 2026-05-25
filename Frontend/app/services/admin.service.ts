import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

export class AdminService {


    private _apiUrl = API_BASE_URL;


    private getHeaders() {

        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',

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

    async getSessoesPorValidar(): Promise<any[]> {
        const response = await fetch(`${this._apiUrl}/coaching/admin/sessoes-por-validar`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao buscar sessoes por validar (${response.status})`);
        }

        return response.json();
    }

    async getSessoesRealizadasMes(): Promise<any[]> {
        const response = await fetch(`${this._apiUrl}/coaching/admin/sessoes-realizadas-mes`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao buscar sessoes realizadas no mes (${response.status})`);
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
