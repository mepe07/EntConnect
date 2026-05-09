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
    private static fetchInterceptorConfigured = false;
    private static originalFetch: typeof window.fetch | null = null;


    private _apiUrl = API_BASE_URL;
    private readonly tokenStorageKey = 'entconnect_token';
    private readonly preferredRoleStoragePrefix = 'entconnect_preferred_role';
    private readonly preferredRoleByUsernameStoragePrefix = 'entconnect_preferred_role_username';

    /**
     * Autentica o utilizador e guarda o token recebido no armazenamento local.
     *
     * @param username - Nome de utilizador.
     * @param password - Password introduzida pelo utilizador.
     * @returns `true` quando o login é concluído com sucesso.
     */
    async login(username: string, password: string) {
        try {
            const rolePreferida = this.obterRolePreferidaPorUsername(username);
            const response = await fetch(`${this._apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, rolePreferida }),
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

            await this.aplicarRolePreferidaNoLogin(user);

            return true;
        } catch (error: Error | unknown) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Troca o cargo ativo e substitui o token local pelo token renovado.
     *
     * @param role - Cargo a ativar para a sessao atual.
     * @returns Dados atualizados do utilizador autenticado.
     */
    async trocarRole(role: string) {
        const token = this.getToken();

        if (!token) {
            throw new Error('Utilizador nÃ£o autenticado.');
        }

        const response = await fetch(`${this._apiUrl}/auth/trocar-role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'NÃ£o foi possÃ­vel trocar de role.');
        }

        const accessToken = data?.access_token;

        if (!accessToken) {
            throw new Error('Token de autenticaÃ§Ã£o nÃ£o recebido.');
        }

        const user = jwtDecode<User>(accessToken);

        this._userToken = accessToken;
        this._userInfo = user;

        localStorage.setItem(this.tokenStorageKey, accessToken);
        this.guardarRolePreferida(user);
        window.dispatchEvent(new CustomEvent('entconnect-role-alterada', { detail: user }));

        return user;
    }

    private async aplicarRolePreferidaNoLogin(user: User) {
        const rolePreferida = this.obterRolePreferida(user);
        const rolesDisponiveis = user.roles ?? [];

        if (!rolePreferida) {
            return;
        }

        if (!rolesDisponiveis.includes(rolePreferida)) {
            this.removerRolePreferida(user);
            return;
        }

        if (rolePreferida === user.role) {
            return;
        }

        try {
            await this.trocarRole(rolePreferida);
        } catch (error) {
            console.warn('Nao foi possivel aplicar o cargo preferido no login:', error);
            this.removerRolePreferida(user);
        }
    }

    private guardarRolePreferida(user: User) {
        const storageKey = this.obterChaveRolePreferida(user);

        if (!user.role) {
            return;
        }

        if (storageKey) {
            localStorage.setItem(storageKey, user.role);
        }

        const usernameStorageKey = this.obterChaveRolePreferidaPorUsername(user.username);

        if (usernameStorageKey) {
            localStorage.setItem(usernameStorageKey, user.role);
        }
    }

    private obterRolePreferida(user: User) {
        const storageKey = this.obterChaveRolePreferida(user);
        const userIdRole = storageKey ? localStorage.getItem(storageKey) : null;

        if (userIdRole) {
            return userIdRole;
        }

        const usernameRole = this.obterRolePreferidaPorUsername(user.username);

        if (usernameRole) {
            return usernameRole;
        }

        return null;
    }

    private removerRolePreferida(user: User) {
        const storageKey = this.obterChaveRolePreferida(user);

        if (storageKey) {
            localStorage.removeItem(storageKey);
        }

        const usernameStorageKey = this.obterChaveRolePreferidaPorUsername(user.username);

        if (usernameStorageKey) {
            localStorage.removeItem(usernameStorageKey);
        }
    }

    private obterChaveRolePreferida(user: User) {
        const userId = user.sub ?? user.idUtilizador;

        if (!userId) {
            return null;
        }

        return `${this.preferredRoleStoragePrefix}_${userId}`;
    }

    private obterRolePreferidaPorUsername(username: string) {
        const storageKey = this.obterChaveRolePreferidaPorUsername(username);

        return storageKey ? localStorage.getItem(storageKey) : null;
    }

    private obterChaveRolePreferidaPorUsername(username?: string) {
        const usernameNormalizado = username?.trim().toLowerCase();

        if (!usernameNormalizado) {
            return null;
        }

        return `${this.preferredRoleByUsernameStoragePrefix}_${usernameNormalizado}`;
    }

    /**
     * Renova os dados da sessao com os cargos atuais do backend.
     */
    async atualizarSessao() {
        const token = this.getToken();

        if (!token) {
            return null;
        }

        const response = await fetch(`${this._apiUrl}/auth/sessao`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return this.getUserInfo();
        }

        const data = await response.json();
        const accessToken = data?.access_token;

        if (!accessToken) {
            return this.getUserInfo();
        }

        const user = jwtDecode<User>(accessToken);

        this._userToken = accessToken;
        this._userInfo = user;

        localStorage.setItem(this.tokenStorageKey, accessToken);

        return user;
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
        window.dispatchEvent(new CustomEvent('entconnect-sessao-invalida'));
    }

    /**
     * Ativa validaÃ§Ã£o global para pedidos Ã  API: adiciona o Bearer token
     * quando existe e redireciona para login se a sessÃ£o for rejeitada.
     */
    configurarValidacaoGlobal() {
        if (AuthService.fetchInterceptorConfigured || typeof window === 'undefined') {
            return;
        }

        AuthService.fetchInterceptorConfigured = true;
        AuthService.originalFetch = window.fetch.bind(window);

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestUrl = this.obterUrlPedido(input);
            const isPedidoApi = this.ePedidoApi(requestUrl);
            const requestInit = isPedidoApi ? this.anexarTokenAoPedido(init) : init;
            const response = await AuthService.originalFetch!(input, requestInit);

            if (isPedidoApi && response.status === 401) {
                this.redirecionarParaLoginPorSessaoInvalida();
            }

            return response;
        };
    }

    private anexarTokenAoPedido(init?: RequestInit): RequestInit | undefined {
        const token = this.getToken();

        if (!token) {
            return init;
        }

        const headers = new Headers(init?.headers);

        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        return {
            ...init,
            headers,
        };
    }

    private obterUrlPedido(input: RequestInfo | URL): string {
        if (typeof input === 'string') {
            return input;
        }

        if (input instanceof URL) {
            return input.toString();
        }

        return input.url;
    }

    private ePedidoApi(url: string): boolean {
        try {
            const requestUrl = new URL(url, window.location.origin);
            const apiUrl = new URL(this._apiUrl, window.location.origin);

            return requestUrl.origin === apiUrl.origin;
        } catch {
            return url.startsWith(this._apiUrl);
        }
    }

    private redirecionarParaLoginPorSessaoInvalida() {
        this.limparSessao();

        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
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

    /**
     * Atualiza as ações rápidas escolhidas pelo utilizador.
     */
    async updateQuickActionPreferences(userId: number, acoesIds: number[]) {
        const token = this.getToken(); 
        
        if (!token) {
            throw new Error('Utilizador não autenticado.');
        }

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
