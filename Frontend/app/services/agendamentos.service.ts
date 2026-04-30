export class AgendamentosService {
    private _apiUrl = 'http://localhost:3000';

    async getAgendamentosProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/agendamentos`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    async getConfirmacoesProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/confirmacoes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    async confirmarSessao(idProfessor: number, idCoaching: number, idEstadoCoaching: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/confirmacoes/${idCoaching}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idEstadoCoaching })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Não foi possível atualizar o estado da sessão.');
        }

        return await response.json();
    }

}
