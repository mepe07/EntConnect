// LÓGICA: Importamos o nosso segurança para podermos usar o Token JWT dele!
import { authService } from './auth.service';
import { API_BASE_URL } from '~/config/api.config';

// URL base das rotas de professores.
// A origem da API vem do .env do frontend através de VITE_API_URL.
const API_URL = `${API_BASE_URL}/professor`;

class ProfessorService {
    
    // ==========================================
    // Função Utilitária (O Carimbo do Segurança)
    // ==========================================
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };
    }

// Altera o método getProfessores para aceitar a página
async getProfessores(page: number = 1) {
    try {
        // Adicionamos o parâmetro ?page= à URL
        const response = await fetch(`${API_URL}?page=${page}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        
        if (!response.ok) throw new Error('Falha ao carregar os professores.');
        
        return await response.json(); // Agora isto devolve { data: [], meta: {} }
    } catch (erro) {
        throw erro;
    }
}

    // ==========================================
    // CREATE: Criar novo
    // ==========================================
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

    // ==========================================
    // DELETE: Apagar
    // ==========================================
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