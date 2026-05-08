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
    ) {
        const bodyRequest = {
            Hora_Inicio: horaInicio,
            Duracao: duracao,
            AlteradoPorUtilizadorID: alteradoPor,
            EstadoDisponibilidadeID: novoEstado,
            IdEstudio: idEstudio,
            ValorPorAluno: valorPorAluno,
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
}
