
export class DisponibilidadesService {
    private _apiUrl = 'http://localhost:3000';

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

    async criarDisponibilidade(dados: any) {
        // Ajusta o URL consoante a rota que definiste no teu controller (ex: /disponibilidades/adicionar)
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