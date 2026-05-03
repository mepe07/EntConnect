import { jwtDecode } from "jwt-decode";
import type { User } from "~/models/interfaces/user.interface";
import { API_BASE_URL } from "../../src/config/api.config";

interface JwtPayloadBase {
    exp?: number;
}

export class AuthService {
    private _userToken: string | null = null;
    private _userInfo: User | null = null;
    // URL base da API.
    // Vem do ficheiro .env do frontend através de VITE_API_URL.
    private _apiUrl = API_BASE_URL;
    private readonly tokenStorageKey = 'entconnect_token';

    async login(username: string, password: string) {
        try {
            const response = await fetch(`${this._apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to log in');
            }

            const token = await response.json();
            const accessToken = token?.access_token;

            if (!accessToken) {
                throw new Error('Token de autenticação não recebido.');
            }

            const user = jwtDecode<User>(accessToken);

            this._userToken = accessToken;
            this._userInfo = user;

            localStorage.setItem(this.tokenStorageKey, accessToken);

            return true;
        } catch (error: Error | unknown) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async forgotPassword(email: string) {
        const response = await fetch(`${this._apiUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Não foi possível iniciar a recuperação da password.');
        }

        return data as { message: string; resetLink?: string };
    }

    async resetPassword(token: string, password: string) {
        const response = await fetch(`${this._apiUrl}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Não foi possível alterar a password.');
        }

        return data as { message: string };
    }

    logout(event?: React.MouseEvent<HTMLAnchorElement>) {
        event?.preventDefault();

        this.limparSessao();
        window.location.href = '/login';
    }

    limparSessao() {
        this._userToken = null;
        this._userInfo = null;
        localStorage.removeItem(this.tokenStorageKey);
    }

    isTokenExpired(token: string): boolean {
        try {
            const decoded = jwtDecode<JwtPayloadBase>(token);

            if (!decoded.exp) {
                return true;
            }

            return decoded.exp * 1000 <= Date.now();
        } catch {
            return true;
        }
    }

    getToken() {
        if (!this._userToken) {
            this._userToken = localStorage.getItem(this.tokenStorageKey);
        }

        if (!this._userToken) {
            return null;
        }

        if (this.isTokenExpired(this._userToken)) {
            this.limparSessao();
            return null;
        }

        return this._userToken;
    }

    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    getUserInfo(): User | null {
        const token = this.getToken();

        if (!token) {
            return null;
        }

        if (!this._userInfo) {
            try {
                this._userInfo = jwtDecode<User>(token);
            } catch {
                this.limparSessao();
                return null;
            }
        }

        return this._userInfo;
    }

    /**
     * 🚀 NOVO MÉTODO: Envia as preferências de Ações Rápidas para o Backend
     */
    async updateQuickActionPreferences(userId: number, acoesIds: number[]) {
        const token = this.getToken(); 
        
        if (!token) {
            throw new Error('Utilizador não autenticado.');
        }

        // Usa o apiUrl que já está definido no topo da tua classe
        const apiUrl = `${this._apiUrl}/utilizador/${userId}/preferencias-acoes`;

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(acoesIds) 
        });

        if (!response.ok) {
            throw new Error(`Erro ao atualizar as preferências: ${response.statusText}`);
        }

        return await response.json();
    }
}

export const authService = new AuthService();