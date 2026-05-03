
import { authService } from './auth.service';
import { API_BASE_URL } from "../../src/config/api.config";


const API_URL = `${API_BASE_URL}/salas`;

export class SalasService {


    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',


            'Authorization': `Bearer ${token}`
        };
    }


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


    async deleteSala(id: number) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });


            if (!response.ok) {

                const errorData = await response.json().catch(() => null);


                const mensagemErro = errorData?.message || 'Falha ao apagar a sala no servidor.';


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

            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Falha ao atualizar a sala.');
            }


            return await response.json();
        } catch (erro) {
            console.error('Erro no updateSala:', erro);
            throw erro;
        }
    }
}


export const salasService = new SalasService();