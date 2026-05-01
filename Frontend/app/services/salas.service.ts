// LÓGICA: Importamos o nosso segurança para podermos usar o Token JWT dele!
import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";
// URL base das rotas de salas.
// A origem da API vem do .env do frontend através de VITE_API_URL.
const API_URL = `${API_BASE_URL}/salas`;

export class SalasService {
    
    // ==========================================
    // Função Utilitária (O Carimbo do Segurança)
    // ==========================================
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            // LÓGICA: Enviamos o crachá de identificação em todos os pedidos!
            // Se o teu NestJS estiver protegido, ele precisa disto para te deixar entrar.
            'Authorization': `Bearer ${token}` 
        };
    }

    // ==========================================
    // READ: Ir buscar todas as salas ao Backend
    // ==========================================
    async getSalas() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar as salas do servidor.');
            }

            // Transforma a resposta do servidor num array de JavaScript
            return await response.json();
        } catch (erro) {
            console.error('Erro no getSalas:', erro);
            throw erro;
        }
    }

    // ==========================================
    // CREATE: Enviar uma nova sala para o Backend
    // ==========================================
    async createSala(dadosNovaSala: { nome: string; modalidade: string; disponivel: boolean }) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: this.getHeaders(),
                // O JSON.stringify transforma o nosso objeto num texto que a internet entende
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

    // ==========================================
    // DELETE: Enviar ordem para apagar ao Backend
    // ==========================================
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