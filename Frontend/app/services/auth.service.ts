import { jwtDecode } from "jwt-decode";
import type { User } from "~/models/interfaces/user.interface";

export class AuthService {
    private _userToken: string | null = null;
    private _userInfo: any = null;
    private _apiUrl = 'http://localhost:3000/auth';

    /**
     * Logs in the user by sending their credentials to the backend and storing the received token in localStorage.
     * 
     * @param username: The username of the user trying to log in.
     * @param password: The password of the user trying to log in.
     */
    async login(username: string, password: string) {
        try {
            // Check if we already have a token in localStorage. If not, proceed with the login request.
            if (!localStorage.getItem('entconnect_token')) {
                const response = await fetch(`${this._apiUrl}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to log in');
                }

                const token = await response.json();
                const user = jwtDecode(token?.access_token);

                this._userToken = token;
                this._userInfo = user;

                localStorage.setItem('entconnect_token', token?.access_token);

                return true;
            }
        } catch (error: Error | unknown) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();

        this._userToken = null;
        this._userInfo = null;
        localStorage.removeItem('entconnect_token');

        window.location.href = '/';
    }

    /**
     * Retrieves the user's token from localStorage if it's not already stored in the service instance.
     * 
     * @returns The user's authentication token, or null if it doesn't exist.
     */
    getToken() {
        if (!this._userToken) {
            this._userToken = localStorage.getItem('entconnect_token');
        }
        return this._userToken;
    }

    /**
     * Retrieves the user's information by decoding the JWT token.
     * 
     * @returns The decoded user information, or null if the token is not available or invalid.
     */
    getUserInfo(): User {
        if (!this._userInfo) {
            const token = this.getToken();
            if (token) {
                this._userInfo = jwtDecode(token);
            }
        }
        return this._userInfo;
    }
}

// Dependencia Singleton
export const authService = new AuthService();