import { API_BASE_URL } from '../../src/config/api.config';
import { authService } from './auth.service';

export class AgendamentosService {
    private _apiUrl = API_BASE_URL;

    /**
     * Headers JSON autenticados para os endpoints privados de agendamentos.
     */
    private getHeaders() {
        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getAgendamentosProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/agendamentos`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao obter agendamentos: ${response.statusText}`);
        }

        return await response.json();
    }

    async getConfirmacoesProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/confirmacoes`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao obter confirmações: ${response.statusText}`);
        }

        return await response.json();
    }

    async confirmarSessao(idProfessor: number, idCoaching: number, idEstadoCoaching: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/confirmacoes/${idCoaching}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ idEstadoCoaching }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Não foi possível atualizar o estado da sessão.');
        }

        return await response.json();
    }
}
