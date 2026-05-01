import { authService } from './auth.service';

const API_URL = 'http://localhost:3000'; 

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