import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";
const API_URL = `${API_BASE_URL}/salas`;

/**
 * Serviço responsável pelo acesso às operações de salas.
 */
export class SalasService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };
    }

    /**
     * Obtém todas as salas disponíveis.
     *
     * @returns Lista de salas devolvida pelo backend.
     */
    async getSalas() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar as salas do servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no getSalas:', erro);
            throw erro;
        }
    }

    /**
     * Cria uma nova sala.
     *
     * @param dadosNovaSala - Dados da sala a criar.
     * @returns Sala criada.
     */
    async createSala(dadosNovaSala: { nome: string; modalidade: string; disponivel: boolean }) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosNovaSala),
            });

            if (!response.ok) {
                throw new Error('Falha ao criar a sala no servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no createSala:', erro);
            throw erro;
        }
    }

    /**
     * Remove uma sala existente.
     *
     * @param id - Identificador da sala.
     * @returns Resposta do backend.
     */
    async deleteSala(id: number) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });

            // LÓGICA DE SÉNIOR: Se a resposta não for OK, vamos ler a carta do NestJS!
            if (!response.ok) {
                // Tentamos extrair o JSON do erro
                const errorData = await response.json().catch(() => null);
                
                // Se o NestJS mandou uma mensagem bonita, usamos essa. Se não, usamos a genérica.
                const mensagemErro = errorData?.message || 'Falha ao apagar a sala no servidor.';
                
                // Atiramos o erro já com a mensagem certa
                throw new Error(mensagemErro);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no deleteSala:', erro);
            throw erro;
        }
    }
    async updateSala(id: number, dadosAtualizados: { nome: string; modalidade: string; disponivel: boolean }) {
        try {
            // LÓGICA: Enviamos o ID no URL, e usamos o método PATCH!
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao atualizar a sala.');
            }

            // O Backend devolve-nos a sala já com a cara nova
            return await response.json();
        } catch (erro) {
            console.error('Erro no updateSala:', erro);
            throw erro;
        }
    }
}

// LÓGICA DE SÉNIOR: Exportamos uma única instância (Singleton) para toda a app!
export const salasService = new SalasService();
