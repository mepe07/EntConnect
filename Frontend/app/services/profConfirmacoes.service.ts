import { API_BASE_URL } from '../../src/config/api.config';
import { authService } from './auth.service';

const API_URL = `${API_BASE_URL}/coaching`;

/**
 * Serviço responsável pelas confirmações pendentes do professor.
 */
export class ProfConfirmacoesService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Lista sessões passadas ainda por confirmar pelo professor.
     *
     * @returns Sessões pendentes de confirmação.
     */
    async getSessoesPendentes() {
        const response = await fetch(`${API_URL}/marcacoes`, {
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`Erro: ${errorData?.message || response.status}`);
        }
        
        const data = await response.json();
        const agora = new Date();
        
        return data.filter((s: any) => {
            const dataSessao = new Date(s.dataInicio);
            const jaPassou = dataSessao < agora;
            const aindaNaoConfirmado = s.confirmacao_prof !== 1 && s.confirmacao_prof !== true;

            return jaPassou && aindaNaoConfirmado;
        });
    }

    /**
     * Confirma uma sessão em nome do professor.
     *
     * @param idCoaching - Identificador da sessão.
     * @returns Resposta do backend.
     */
    async confirmarSessao(idCoaching: number) {
        const response = await fetch(`${API_URL}/${idCoaching}/confirmar-professor`, {
            method: 'PATCH',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao confirmar a sessão no servidor.');
        }

        return response.json();
    }
}

export const profConfirmacoesService = new ProfConfirmacoesService();
