

import type {
    Evento,
    EventoResumo,
    TipoEvento,
    FiltrosGestaoEventos,
    GuardarEventoPayload,
} from '../types/eventos.types';

import { API_BASE_URL } from "../../src/config/api.config";


const API_URL = `${API_BASE_URL}/eventos`;
const TOKEN_STORAGE_KEY = 'entconnect_token';

/**
 * Filtros aceites na listagem pública de eventos.
 */
export type ListarEventosPublicosParams = {
    pesquisa?: string;
    tipo?: TipoEvento | 'todos';
    destaque?: boolean;
    apenasFuturos?: boolean;
    limite?: number;
};

function getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getAuthHeaders() {
    return {
        Authorization: `Bearer ${getToken()}`,
    };
}

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

    }

    throw new Error(mensagem);
}

/**
 * Converte filtros de listagem para uma query string compatível com a API.
 *
 * @param params - Filtros com valores simples.
 * @returns Query string pronta a anexar ao endpoint.
 */
function criarQueryString(params?: object): string {
    const query = new URLSearchParams();

    if (!params) {
        return '';
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        if (key === 'tipo' && value === 'todos') {
            return;
        }

        query.set(key, String(value));
    });

    const queryString = query.toString();

    return queryString ? `?${queryString}` : '';
}

/**
 * Constrói o `FormData` usado na criação e edição de eventos.
 *
 * @param dados - Dados do formulário de evento.
 * @returns FormData preparado para envio ao backend.
 */
function criarFormDataEvento(dados: GuardarEventoPayload): FormData {
    const formData = new FormData();

    formData.append('titulo', dados.titulo);
    formData.append('tipo', dados.tipo);
    formData.append('dataInicio', dados.dataInicio);
    formData.append('publico', String(dados.publico));
    formData.append('publicado', String(dados.publicado));
    formData.append('destaque', String(dados.destaque));
    formData.append('destaqueLogin', String(dados.destaqueLogin));

    if (dados.slug?.trim()) {
        formData.append('slug', dados.slug.trim());
    }

    if (dados.resumo?.trim()) {
        formData.append('resumo', dados.resumo.trim());
    }

    if (dados.descricao?.trim()) {
        formData.append('descricao', dados.descricao.trim());
    }

    if (dados.local?.trim()) {
        formData.append('local', dados.local.trim());
    }

    if (dados.dataFim?.trim()) {
        formData.append('dataFim', dados.dataFim);
    }

    if (dados.ficheiroImagem) {
        formData.append('imagem', dados.ficheiroImagem);
    }

    return formData;
}

/**
 * Serviço de acesso aos eventos públicos e à gestão interna de eventos.
 */
export const eventosService = {


    /**
     * Lista eventos disponíveis publicamente.
     *
     * @param params - Filtros opcionais da montra pública.
     * @returns Eventos públicos encontrados.
     */
    async listarEventosPublicos(
        params?: ListarEventosPublicosParams,
    ): Promise<Evento[]> {
        const queryString = criarQueryString(params);

        const response = await fetch(`${API_URL}/publicos${queryString}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao carregar eventos públicos.');
        }

        return response.json();
    },

    /**
     * Lista eventos em destaque para o aviso apresentado após login.
     *
     * @returns Resumos dos eventos em destaque.
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
     * Obtém o detalhe público de um evento pelo slug.
     *
     * @param slug - Identificador textual do evento.
     * @returns Evento público correspondente.
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


    /**
     * Lista eventos para a área de gestão.
     *
     * @param filtros - Filtros internos de gestão.
     * @returns Eventos disponíveis para gestão.
     */
    async listarEventosGestao(filtros?: FiltrosGestaoEventos): Promise<Evento[]> {
        const queryString = criarQueryString(filtros);

        const response = await fetch(`${API_URL}/gestao${queryString}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao carregar eventos de gestão.');
        }

        return response.json();
    },

    /**
     * Cria um evento.
     *
     * @param dados - Dados e imagem opcional do evento.
     * @returns Evento criado.
     */
    async criarEvento(dados: GuardarEventoPayload): Promise<Evento> {
        const formData = criarFormDataEvento(dados);

        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao criar evento.');
        }

        return response.json();
    },

    /**
     * Atualiza um evento existente.
     *
     * @param idEvento - Identificador do evento.
     * @param dados - Dados atualizados do evento.
     * @returns Evento atualizado.
     */
    async atualizarEvento(
        idEvento: number,
        dados: GuardarEventoPayload,
    ): Promise<Evento> {
        const formData = criarFormDataEvento(dados);

        const response = await fetch(`${API_URL}/${idEvento}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: formData,
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao atualizar evento.');
        }

        return response.json();
    },

    /**
     * Remove logicamente um evento.
     *
     * @param idEvento - Identificador do evento.
     * @returns Evento removido.
     */
    async removerEvento(idEvento: number): Promise<Evento> {
        const response = await fetch(`${API_URL}/${idEvento}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao remover evento.');
        }

        return response.json();
    },

    /**
     * Reativa um evento removido.
     *
     * @param idEvento - Identificador do evento.
     * @returns Evento reativado.
     */
    async reativarEvento(idEvento: number): Promise<Evento> {
        const response = await fetch(`${API_URL}/${idEvento}/reativar`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            return parseError(response, 'Erro ao reativar evento.');
        }

        return response.json();
    },
};
