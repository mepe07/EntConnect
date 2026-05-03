import { API_BASE_URL } from "../../src/config/api.config";
export class DisponibilidadesService {


    private _apiUrl = API_BASE_URL;


    async getAvailability() {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/disponibilidade`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    };

    async atualizarEstado(idDisponibilidade: number, novoEstado: number, horaInicio: string, duracao: number, alteradoPor: number, idEstudio?: number, valorPorAluno?: number) {

        const bodyRequest = {
            Hora_Inicio: horaInicio,
            Duracao: duracao,
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

    async criarDisponibilidade(dados: any) {

        const response = await fetch(`${this._apiUrl}/utilizador/professor/adicionar-disponibilidade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            throw new Error('Erro ao criar disponibilidade.');
        }

        return await response.json();
    }
}