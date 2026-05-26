import { API_BASE_URL } from "../../src/config/api.config";
import { authService } from './auth.service';

export class DisponibilidadesService {
    private _apiUrl = API_BASE_URL;

    /**
     * Devolve os headers base para pedidos JSON autenticados.
     * O token é adicionado apenas quando existe uma sessão válida.
     */
    private getHeaders() {
        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async getAvailability() {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao obter disponibilidades: ${response.statusText}`);
        }

        return await response.json();
    }

    async atualizarEstado(
        idDisponibilidade: number,
        novoEstado: number,
        horaInicio: string,
        duracao: number,
        alteradoPor: number,
        idEstudio?: number,
        valorPorAluno?: number,
        maxAlunos?: number,
    ) {
        const bodyRequest = {
            Hora_Inicio: horaInicio,
            Duracao: duracao,
            AlteradoPorUtilizadorID: alteradoPor,
            EstadoDisponibilidadeID: novoEstado,
            IdEstudio: idEstudio,
            ValorPorAluno: valorPorAluno,
            MaxAlunos: maxAlunos,
        };

        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/${idDisponibilidade}/atualizar-disponibilidade`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(bodyRequest),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erro ao atualizar disponibilidade: ${response.statusText}`);
        }

        return await response.json();
    }

    async criarDisponibilidade(dados: any) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/adicionar-disponibilidade`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao criar disponibilidade.');
        }

        return await response.json();
    }

    async atualizarDisponibilidade(idDisponibilidade: number, dados: any) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/${idDisponibilidade}/atualizar-disponibilidade`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao atualizar disponibilidade.');
        }

        return await response.json();
    }

    async eliminarDisponibilidade(idDisponibilidade: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/${idDisponibilidade}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao eliminar disponibilidade.');
        }

        return await response.json();
    }

    async criarExcecao(idDisponibilidade: number, dataCancelada: string) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/${idDisponibilidade}/excecoes`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ dataCancelada }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao criar excecao.');
        }

        return await response.json();
    }

    async eliminarExcecao(idExcecao: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/excecoes/${idExcecao}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Erro ao eliminar excecao.');
        }

        return await response.json();
    }
}
