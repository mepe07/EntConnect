export class UtilizadorService {
    private _apiUrl = 'http://localhost:3000';

    /**
     * Obtém a lista de utilizadores da API.
     */
    async getUsers() {
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    /**
     * Bloqueia um utilizador com base no seu ID.
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
     */
    async unlockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/unlock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }

    /**
     * Atualiza a password de um utilizador com base no seu ID.
     * 
     * @param userId O ID do utilizador.
     * @param newPassword A nova password em texto simples (o backend faz o hash com bcrypt).
     */
    /**
     * Obtém o URL da foto de perfil de um utilizador.
     */
    async getFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/foto`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }

    /**
     * Faz upload de uma foto de perfil para um utilizador.
     * Usa multipart/form-data, tal como o backend espera.
     */
    async uploadFoto(userId: number, file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/uploadphoto`, {
            method: 'PUT',
            body: formData,
            // Não definir Content-Type: o browser define automaticamente com o boundary correto
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao fazer upload da foto.');
        }

        return await response.json();
    }

    /**
     * Remove a foto de perfil de um utilizador.
     */
    async removerFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/removephoto`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao remover a foto.');
        }

        return await response.json();
    }

    async updatePassword(userId: number, newPassword: string) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar a password.');
        }

        return await response.json();
    }
}