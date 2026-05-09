import { authService } from './auth.service';
import { API_BASE_URL } from '~/config/api.config';

const API_URL = API_BASE_URL;

export const coachingService = {

    getMarcacoes: async () => {

        const token = authService.getToken();


        const response = await fetch(`${API_URL}/coaching/marcacoes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar a agenda de coaching');
        }


        return response.json();
    }

};