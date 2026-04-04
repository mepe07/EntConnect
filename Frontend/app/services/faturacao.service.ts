// Ficheiro: app/services/faturacao.service.ts

class FaturacaoService {
    // 1. A MORADA COMPLETA: Dizemos explicitamente onde mora o NestJS
    // Nota: Removi o '/api' porque o teu NestJS (no main.ts) não tem prefixo global.
    private readonly API_URL = 'http://localhost:3000/faturacao';

    async getRelatorio(inicio: string, fim: string) {
        
        // 2. O CAMINHO EXATO: Usamos 'Relatorio' com R maiúsculo, igual ao Controller do NestJS!
        const urlCompleto = `${this.API_URL}/Relatorio?inicio=${inicio}&fim=${fim}`;
        
        console.log("A pedir dados a:", urlCompleto); // Este log vai ajudar-te a ver o URL final no F12

        try {
            const response = await fetch(urlCompleto);
            
            if (!response.ok) {
                // Se o NestJS devolver um Erro 400 (BadRequest), tentamos ler a mensagem
                const erroDoServidor = await response.json().catch(() => null);
                throw new Error(erroDoServidor?.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();
            
        } catch (erro) {
            console.error("O Estafeta caiu da mota:", erro);
            throw erro; // Passamos o erro para a página de faturacao.tsx lidar com ele
        }
    }
}

export const faturacaoService = new FaturacaoService();