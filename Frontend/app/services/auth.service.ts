import { jwtDecode } from "jwt-decode";
import type { User } from "~/models/interfaces/user.interface";
import { API_BASE_URL } from "../../src/config/api.config";

interface JwtPayloadBase {
    exp?: number;
}

/**
 * Gere autenticação, sessão local e leitura dos dados do utilizador autenticado.
 */
export class AuthService {
    private _userToken: string | null = null;
    private _userInfo: User | null = null;


    private _apiUrl = API_BASE_URL;
    private readonly tokenStorageKey = 'entconnect_token';

    /**
     * Autentica o utilizador e guarda o token recebido no armazenamento local.
     *
     * @param username - Nome de utilizador.
     * @param password - Password introduzida pelo utilizador.
     * @returns `true` quando o login é concluído com sucesso.
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
     * Pede ao backend o início do fluxo de recuperação de password.
     *
     * @param email - Email associado à conta.
     * @returns Mensagem devolvida pela API e, quando disponível, o link de reset.
     */
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

    /**
     * Define uma nova password usando o token de recuperação.
     *
     * @param token - Token recebido no fluxo de recuperação.
     * @param password - Nova password.
     * @returns Mensagem de confirmação devolvida pela API.
     */
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

    /**
     * Termina a sessão atual e redireciona o utilizador para o login.
     *
     * @param event - Evento opcional do link de logout.
     */
    logout(event?: React.MouseEvent<HTMLAnchorElement>) {
        event?.preventDefault();

        this.limparSessao();
        window.location.href = '/login';
    }

    /**
     * Remove o token e os dados de utilizador mantidos em memória e localStorage.
     */
    limparSessao() {
        this._userToken = null;
        this._userInfo = null;
        localStorage.removeItem(this.tokenStorageKey);
    }

    /**
     * Verifica se um JWT já expirou.
     *
     * @param token - Token JWT a validar.
     * @returns `true` quando o token está expirado ou inválido.
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
     * Obtém o token de autenticação atual.
     *
     * @returns Token válido ou `null` quando não existe sessão ativa.
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
     * Indica se existe uma sessão autenticada válida.
     *
     * @returns `true` quando há token válido.
     */
    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    /**
     * Lê os dados do utilizador a partir do token da sessão.
     *
     * @returns Dados do utilizador autenticado ou `null` se a sessão não for válida.
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

export const authService = new AuthService();
