// Ficheiro: Frontend/app/services/eventos.service.ts

import type { Evento, EventoResumo } from '../types/eventos.types';

const API_URL = 'http://localhost:3000/eventos';

async function parseError(response: Response, fallback: string): Promise<never> {
    let mensagem = fallback;

    try {
        const erro = await response.json();

        if (Array.isArray(erro.message)) {
            mensagem = erro.message.join(', ');
        } else if (erro.message) {
            mensagem = erro.message;
        }
    } catch {
        // Se a resposta não vier em JSON, mantemos a mensagem genérica.
    }

    throw new Error(mensagem);
}

export const eventosService = {
    /**
     * Vai buscar os eventos que podem aparecer no toast do login.
     *
     * Esta rota é pública:
     * - não precisa de token;
     * - não deve bloquear o login se falhar;
     * - só devolve eventos públicos, publicados, ativos e marcados como destaque_login.
     */
    async listarEventosLoginToast(): Promise<EventoResumo[]> {
        const response = await fetch(`${API_URL}/publicos/login-toast`, {
            method: 'GET',
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao carregar eventos em destaque.');
        }

        return response.json();
    },

    /**
     * Obtém o detalhe público de um evento através do slug.
     * Vai ser usado mais tarde na página /eventos/:slug.
     */
    async obterEventoPublicoPorSlug(slug: string): Promise<Evento> {
        const response = await fetch(`${API_URL}/publicos/${slug}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao carregar o evento.');
        }

        return response.json();
    },
};