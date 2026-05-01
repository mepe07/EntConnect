import { API_BASE_URL } from "~/config/api.config";

export class DisponibilidadesService {
    // URL base da API.
    // Vem do ficheiro .env do frontend através de VITE_API_URL.
    private _apiUrl = API_BASE_URL;

    /**
         * Obtém as disponibilidades dos professores.
         * @returns Lista de disponibilidades dos professores.
         */
    async getAvailability() {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    };

    async atualizarEstado(idDisponibilidade: number, novoEstado: number, horaInicio: string, duracao: number, alteradoPor: number, idEstudio?: number, valorPorAluno?: number) {
        
        const bodyRequest = {
            Hora_Inicio: horaInicio, // Agora já recebe "2026-04-06T14:00:00.000Z"
            Duracao: duracao,        // Agora já recebe ex: 90
            AlteradoPorUtilizadorID: alteradoPor,
            EstadoDisponibilidadeID: novoEstado,
            IdEstudio: idEstudio,
            ValorPorAluno: valorPorAluno
        };

        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade/${idDisponibilidade}/atualizar-disponibilidade`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyRequest)
        });
        
        return await response.json();
    }
}