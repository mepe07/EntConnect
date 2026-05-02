import { authService } from './auth.service';
import { API_BASE_URL } from '~/config/api.config';

const API_URL = API_BASE_URL; 

export const coachingService = {
    
    getMarcacoes: async () => {
        // 1. Vai buscar o Token à mochila
        const token = authService.getToken(); 
        
        // 2. Faz o pedido ao Backend (àquela rota que criámos no Controller!)
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

        // 3. Devolve os dados limpinhos para a tua tabela do React
        return response.json();
    }
    
};