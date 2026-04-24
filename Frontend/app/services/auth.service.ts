import { jwtDecode } from "jwt-decode";
import type { User } from "~/models/interfaces/user.interface";

interface JwtPayloadBase {
    exp?: number;
}

export class AuthService {
    private _userToken: string | null = null;
    private _userInfo: User | null = null;
    private _apiUrl = 'http://localhost:3000';
    private readonly tokenStorageKey = 'entconnect_token';

    /**
     * Efetua login no backend e guarda o token recebido.
     *
     * Importante:
     * O login deve fazer sempre pedido ao backend, mesmo que já exista token no localStorage.
     * Assim evitamos reutilizar tokens expirados ou sessões antigas.
     */
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

    /**
     * Termina a sessão do utilizador.
     */
    logout(event?: React.MouseEvent<HTMLAnchorElement>) {
        event?.preventDefault();

        this.limparSessao();
        window.location.href = '/login';
    }

    /**
     * Limpa token e dados do utilizador.
     * Não redireciona automaticamente.
     */
    limparSessao() {
        this._userToken = null;
        this._userInfo = null;
        localStorage.removeItem(this.tokenStorageKey);
    }

    /**
     * Verifica se um JWT já expirou.
     *
     * No JWT, o campo "exp" vem em segundos.
     * O Date.now() trabalha em milissegundos.
     */
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

    /**
     * Obtém o token apenas se ele ainda for válido.
     * Se estiver expirado ou inválido, limpa a sessão.
     */
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

    /**
     * Indica se existe uma sessão válida.
     */
    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    /**
     * Obtém a informação do utilizador através do token válido.
     */
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
}

// Dependência Singleton
export const authService = new AuthService();