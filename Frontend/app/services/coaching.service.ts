import { authService } from './auth.service';
import { API_BASE_URL } from '~/config/api.config';

const API_URL = API_BASE_URL; 

/**
 * Serviço leve para operações de agenda de coaching no frontend.
 */
export const coachingService = {
    /**
     * Obtém as marcações de coaching do utilizador autenticado.
     *
     * @returns Lista de marcações devolvida pelo backend.
     */
    getMarcacoes: async () => {
        const token = authService.getToken(); 

        const response = await fetch(`${API_URL}/coaching/marcacoes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar a agenda de coaching');
        }

        return response.json();
    }
    
};
