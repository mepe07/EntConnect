import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

export class EEService {


    private _apiUrl = API_BASE_URL;


    private getHeaders() {

        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',

            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }


    async getAlunosByEE(idEncEducacao: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar alunos: ${response.statusText}`);
        }

        return await response.json();
    }

    async getMeusEducandos() {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/me/alunos`, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao buscar educandos: ${response.statusText}`);
        }

        return await response.json();
    }

    async criarMeuEducando(payload: any) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/me/alunos`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao adicionar educando: ${response.statusText}`);
        }

        return await response.json();
    }

    async atualizarMeuEducando(idAluno: number, payload: any) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/me/alunos/${idAluno}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao atualizar educando: ${response.statusText}`);
        }

        return await response.json();
    }

    async removerMeuEducando(idAluno: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/me/alunos/${idAluno}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao remover educando: ${response.statusText}`);
        }

        return await response.json();
    }


    async inscreverAlunoCoaching(idDisponibilidade: number, payload: any) {
        const response = await fetch(`${this._apiUrl}/coaching/disponibilidade/${idDisponibilidade}/inscrever-aluno`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao inscrever aluno: ${response.statusText}`);
        }

        return await response.json();
    }

    async removerAlunoCoaching(idAluno: number, idCoaching: number) {
        const response = await fetch(`${this._apiUrl}/coaching/remover-aluno/${idAluno}/coaching/${idCoaching}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao remover aluno: ${response.statusText}`);
        }
        return await response.json();
    }

    async getMarcacoesByEE(idEE: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idEE}/EE/marcacoes`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Erro ao buscar marcações: ${response.statusText}`);
        }
        return await response.json();
    }

    async getConfirmacoesByEE(idEE: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idEE}/EE/confirmacoes`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Erro ao buscar confirmações: ${response.statusText}`);
        }
        return await response.json();
    }

    async confirmarSessaoEE(idEE: number, idCoaching: number, idEstadoCoaching: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idEE}/EE/confirmacoes/${idCoaching}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ idEstadoCoaching })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Não foi possível atualizar o estado da sessão.');
        }

        return await response.json();
    }


}
