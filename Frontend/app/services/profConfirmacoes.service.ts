import { API_BASE_URL } from '../../src/config/api.config'; // Confirma se o caminho está certo
import { authService } from './auth.service'; // Confirma o caminho do teu authService!

const API_URL = `${API_BASE_URL}/coaching`;

export class ProfConfirmacoesService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // 1. Listar sessões que o professor precisa de confirmar
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
        
        // Filtra as sessões que já passaram da hora e que ainda não têm a confirmação do professor
        return data.filter((s: any) => {
            const dataSessao = new Date(s.dataInicio);
            const jaPassou = dataSessao < agora;
            
            // Garante que exclui se a confirmacao_prof for 1 (número) ou true (booleano)
            const aindaNaoConfirmado = s.confirmacao_prof !== 1 && s.confirmacao_prof !== true;

            return jaPassou && aindaNaoConfirmado;
        });
    }

    // 2. A FUNÇÃO QUE FALTAVA! Chamar o endpoint de confirmação
    async confirmarSessao(idCoaching: number) {
        // Usa o endpoint que criaste no teu NestJS (PATCH)
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