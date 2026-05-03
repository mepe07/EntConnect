import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

const API_URL = `${API_BASE_URL}/professor`;

/**
 * Serviço responsável pelo acesso às operações de professores.
 */
class ProfessorService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };
    }

/**
 * Obtém professores com paginação.
 *
 * @param page - Página a consultar.
 * @returns Resultado paginado devolvido pelo backend.
 */
async getProfessores(page: number = 1) {
    try {
        const response = await fetch(`${API_URL}?page=${page}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        
        if (!response.ok) throw new Error('Falha ao carregar os professores.');
        
        return await response.json();
    } catch (erro) {
        throw erro;
    }
}

    /**
     * Cria um novo professor.
     *
     * @param dadosNovoProfessor - Dados do professor a criar.
     * @returns Professor criado.
     */
    async createProfessor(dadosNovoProfessor: any) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosNovoProfessor),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao criar o professor no servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no createProfessor:', erro);
            throw erro;
        }
    }

    /**
     * Remove um professor.
     *
     * @param id - Identificador do professor.
     * @returns Resposta do backend.
     */
    async deleteProfessor(id: number) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao apagar o professor no servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no deleteProfessor:', erro);
            throw erro;
        }
    }

    // ==========================================
    // UPDATE: Atualizar (PATCH)
    // ==========================================
    async updateProfessor(id: number, dadosAtualizados: any) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao atualizar o professor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no updateProfessor:', erro);
            throw erro;
        }
    }
}

// LÓGICA DE SÉNIOR: Exportamos a instância com o nome exato que usaste no professor.tsx!
export const professoresService = new ProfessorService();
