import { API_BASE_URL } from '../../src/config/api.config';
import { authService } from './auth.service';

const API_URL = `${API_BASE_URL}/coaching`;

export interface PropostaCoachingPayload {
    idEncEducacao?: number;
    idProfessor?: number;
    idModalidade: number;
    inicio: string;
    duracaoMinutos: number;
    alunosIds: number[];
    mensagem?: string;
}

class CoachingPropostasService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getContexto() {
        const response = await fetch(`${API_URL}/propostas/contexto`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao carregar dados para proposta.');
        }

        return response.json();
    }

    async pesquisarEncarregados(search: string) {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());

        const response = await fetch(`${API_URL}/propostas/encarregados?${params.toString()}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao pesquisar encarregados.');
        }

        return response.json();
    }

    async criarProposta(payload: PropostaCoachingPayload) {
        const response = await fetch(`${API_URL}/propostas`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao criar proposta.');
        }

        return response.json();
    }

    async getPendentesAdmin() {
        const response = await fetch(`${API_URL}/admin/propostas-pendentes`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao carregar propostas pendentes.');
        }

        return response.json();
    }

    async aprovar(idPedido: number) {
        const response = await fetch(`${API_URL}/admin/propostas/${idPedido}/aprovar`, {
            method: 'PATCH',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao aprovar proposta.');
        }

        return response.json();
    }

    async rejeitar(idPedido: number) {
        const response = await fetch(`${API_URL}/admin/propostas/${idPedido}/rejeitar`, {
            method: 'PATCH',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao rejeitar proposta.');
        }

        return response.json();
    }
}

export const coachingPropostasService = new CoachingPropostasService();
