export class AgendamentosService {
    private _apiUrl = 'http://localhost:3000';

    async getAgendamentosProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/agendamentos`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

}
