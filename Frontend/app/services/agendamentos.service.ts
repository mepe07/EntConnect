/**
 * Serviço de acesso aos agendamentos e confirmações do professor.
 */
export class AgendamentosService {
    private _apiUrl = 'http://localhost:3000';

    /**
     * Obtém os agendamentos futuros de um professor.
     *
     * @param idProfessor - Identificador do professor.
     * @returns Lista de agendamentos devolvida pelo backend.
     */
    async getAgendamentosProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/agendamentos`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    /**
     * Obtém sessões pendentes de confirmação para um professor.
     *
     * @param idProfessor - Identificador do professor.
     * @returns Lista de sessões a confirmar.
     */
    async getConfirmacoesProfessor(idProfessor: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/professor/${idProfessor}/confirmacoes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    /**
     * Atualiza o estado de confirmação de uma sessão.
     *
     * @param idProfessor - Identificador do professor.
     * @param idCoaching - Identificador da sessão.
     * @param idEstadoCoaching - Novo estado da sessão.
     * @returns Resposta do backend.
     */
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
