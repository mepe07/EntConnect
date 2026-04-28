export class RolesService {
    private _apiUrl = 'http://localhost:3000';

    async getAgendamentosProfessor(idUtilizador: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idUtilizador}/roles-ids`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }
}
