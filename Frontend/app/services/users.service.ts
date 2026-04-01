export class UsersService {
    private _apiUrl = 'http://localhost:3000';

    /**
     * Bloqueia um utilizador com base no seu ID.
     * 
     * @param userId: O ID do utilizador a ser bloqueado.
     * @returns A resposta da API após tentar bloquear o utilizador.
     */
    async blockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/block`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });

        return await response.json(); 
    }

    /**
     * Desbloqueia um utilizador com base no seu ID.
     * 
     * @param userId: O ID do utilizador a ser desbloqueado.
     * @returns A resposta da API após tentar desbloquear o utilizador.
     */
    async unlockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/unlock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });

        return await response.json(); 
    }

    /**
     * Obtém a lista de utilizadores da API.
     * 
     * @returns A resposta da API após tentar obter os utilizadores.
     */
    async getUsers() {
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        return await response.json(); 
    }
}