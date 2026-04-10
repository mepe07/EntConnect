// LÓGICA: Importamos o nosso segurança para podermos usar o Token JWT dele!
import { authService } from './auth.service';

// A morada do teu Backend em NestJS para os professores
const API_URL = 'http://localhost:3000/professor';

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

    // ==========================================
    // READ: Ir buscar todos
    // ==========================================
    async getProfessores() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar os professores do servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no getProfessores:', erro);
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