import { API_BASE_URL } from '../../src/config/api.config';
import { authService } from './auth.service';

export class RolesService {
    private _apiUrl = API_BASE_URL;

    /**
     * Headers JSON autenticados para consultar as roles do utilizador.
     */
    private getHeaders() {
        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getAgendamentosProfessor(idUtilizador: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idUtilizador}/roles-ids`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao obter roles: ${response.statusText}`);
        }

        return await response.json();
    }
}
