import { API_BASE_URL } from "../../src/config/api.config";
/**
 * Serviço responsável pelas disponibilidades dos professores.
 */
export class DisponibilidadesService {
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

    /**
     * Atualiza o estado de uma disponibilidade.
     *
     * @param idDisponibilidade - Identificador da disponibilidade.
     * @param novoEstado - Novo estado da disponibilidade.
     * @param horaInicio - Hora de início da disponibilidade.
     * @param duracao - Duração em minutos.
     * @param alteradoPor - Utilizador que realiza a alteração.
     * @param idEstudio - Estúdio associado, quando aplicável.
     * @param valorPorAluno - Valor por aluno, quando aplicável.
     * @returns Resposta do backend.
     */
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

    /**
     * Cria uma nova disponibilidade.
     *
     * @param dados - Dados da disponibilidade.
     * @returns Disponibilidade criada.
     */
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
