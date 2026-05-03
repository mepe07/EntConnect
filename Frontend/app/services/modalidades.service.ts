import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";

const API_URL = `${API_BASE_URL}/modalidade`;

/**
 * Serviço responsável pelo acesso às operações de modalidades.
 */
class ModalidadesService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };
    }

    /**
     * Obtém todas as modalidades disponíveis.
     *
     * @returns Lista de modalidades.
     */
    async getModalidades() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar as modalidades do servidor.');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no getModalidades:', erro);
            throw erro;
        }
    }

  /**
   * Cria uma nova modalidade.
   *
   * @param dadosNovaModalidade - Dados da modalidade a criar.
   * @returns Modalidade criada.
   */
  async createModalidade(dadosNovaModalidade: { descricao: string; }) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ Descricao: dadosNovaModalidade.descricao }),
      });

      if (!response.ok) {
        const erroReal = await response.text();
        console.error("Motivo da recusa do backend:", erroReal);
        
        throw new Error('Falha ao criar a modalidade no servidor.');
      }

      return await response.json();
    } catch (erro) {
      console.error('Erro no createModalidade:', erro);
      throw erro;
    }
  }

    /**
     * Remove uma modalidade.
     *
     * @param id - Identificador da modalidade.
     * @returns Resposta do backend.
     */
    async deleteModalidade(id: number) {
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
                const mensagemErro = errorData?.message || 'Falha ao apagar a modalidade no servidor.';
                
                // Atiramos o erro já com a mensagem certa
                throw new Error(mensagemErro);
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no deleteModalidade:', erro);
            throw erro;
        }
    }
    async updateModalidade(id: number, dadosAtualizados: { descricao: string }) {
        try {
            // LÓGICA: Enviamos o ID no URL, e usamos o método PATCH!
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao atualizar a modalidade.');
            }

            // O Backend devolve-nos a modalidade já com a cara nova
            return await response.json();
        } catch (erro) {
            console.error('Erro no updateModalidade:', erro);
            throw erro;
        }
    }
}

// LÓGICA DE SÉNIOR: Exportamos uma única instância (Singleton) para toda a app!
export const modalidadesService = new ModalidadesService();
