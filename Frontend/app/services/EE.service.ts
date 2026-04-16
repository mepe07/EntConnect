import { authService } from './auth.service'; // Ajusta o caminho se for preciso

export class EEService {
    private _apiUrl = 'http://localhost:3000';

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
}