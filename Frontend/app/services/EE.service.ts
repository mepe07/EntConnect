import { authService } from './auth.service'; // Ajusta o caminho se for preciso
import { API_BASE_URL } from "../../src/config/api.config";

export class EEService {
    // URL base da API.
    // Vem do ficheiro .env do frontend através de VITE_API_URL.
    private _apiUrl = API_BASE_URL;

    /**
     * Função auxiliar para gerar os headers comuns, incluindo o Token de segurança.
     */
    private getHeaders() {
        // Exemplo: Buscar o token ao localStorage ou ao teu AuthService
        const token = authService.getToken(); 
        
        return {
            'Content-Type': 'application/json',
            // Só adiciona o Authorization se o token existir
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
        };
    }

    /**
     * Obtém todos os alunos associados a um Encarregado de Educação
     */
    async getAlunosByEE(idEncEducacao: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'GET',
            headers: this.getHeaders() // 👈 Adiciona os headers de segurança
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

    /**
     * Inscreve um aluno numa sessão de Coaching
     */
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
    
    
}
