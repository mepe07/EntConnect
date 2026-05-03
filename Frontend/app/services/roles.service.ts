/**
 * Serviço auxiliar para obter os IDs de roles associados a um utilizador.
 */
export class RolesService {
    private _apiUrl = 'http://localhost:3000';

    /**
     * Obtém os identificadores de role associados a um utilizador.
     *
     * @param idUtilizador - Identificador do utilizador.
     * @returns Estrutura com os IDs resolvidos pelo backend.
     */
    async getAgendamentosProfessor(idUtilizador: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${idUtilizador}/roles-ids`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }
}
