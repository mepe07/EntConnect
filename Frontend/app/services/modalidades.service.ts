import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";


const API_URL = `${API_BASE_URL}/modalidade`;

class ModalidadesService {


    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',


            'Authorization': `Bearer ${token}`
        };
    }


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


    async deleteModalidade(id: number) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });


            if (!response.ok) {

                const errorData = await response.json().catch(() => null);


                const mensagemErro = errorData?.message || 'Falha ao apagar a modalidade no servidor.';


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

            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao atualizar a modalidade.');
            }


            return await response.json();
        } catch (erro) {
            console.error('Erro no updateModalidade:', erro);
            throw erro;
        }
    }
}


export const modalidadesService = new ModalidadesService();