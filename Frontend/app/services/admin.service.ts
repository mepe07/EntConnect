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

    /**
     * Exporta as sessões validadas para um ficheiro Excel.
     * @returns {Promise<Blob>} O ficheiro em formato Blob para download.
     */
    async exportarSessoesExcel(): Promise<Blob> {
        // 1. Usamos o getHeaders() para garantir que usamos o mesmo token de todos os outros pedidos
        const response = await fetch(`${this._apiUrl}/coaching/exportar-excel`, {
            method: 'GET',
            headers: {
                ...this.getHeaders(), 
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

        // 3. Verifica se deu erro
        if (!response.ok) {
            throw new Error('Falha ao exportar as sessões.');
        }

        // 4. Devolvemos em formato Blob
        return await response.blob();
    }
    
}