// LÓGICA: Importamos o nosso segurança para podermos usar o Token JWT dele!
import { authService } from './auth.service';

// A morada do teu Backend em NestJS
const API_URL = 'http://localhost:3000/modalidade';

class ModalidadesService {
    
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
    async getModalidades() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar as modalidades do servidor.');
            }

            // Transforma a resposta do servidor num array de JavaScript
            return await response.json();
        } catch (erro) {
            console.error('Erro no getModalidades:', erro);
            throw erro;
        }
    }

    // ==========================================
    // CREATE: Enviar uma nova modalidade para o Backend
    // ==========================================
// =====================================================================
  // CREATE: Enviar uma nova modalidade para o Backend
  // =====================================================================
  async createModalidade(dadosNovaModalidade: { descricao: string; }) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: this.getHeaders(), // Mantemos os teus headers de segurança!
        
        // 👇 AQUI ESTÁ A CORREÇÃO:
        // Mapeamos o "descricao" do frontend para "Descricao" (com D maiúsculo) para o backend aceitar
        body: JSON.stringify({ Descricao: dadosNovaModalidade.descricao }),
      });

      if (!response.ok) {
        // Se quiseres ver o erro real do backend na consola, podes adicionar isto:
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

    // ==========================================
    // DELETE: Enviar ordem para apagar ao Backend
    // ==========================================
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