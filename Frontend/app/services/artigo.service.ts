// Ficheiro: frontend/src/services/marketplace.service.ts

// Adapta este URL base para o porto onde o teu NestJS está a correr (normalmente 3000)
const API_URL = 'http://localhost:3000/artigo';

// Função auxiliar para ir buscar o token (adapta consoante a forma como guardas o token no login)
const getToken = () => localStorage.getItem('entconnect_token');

export const marketplaceService = {

    // ============================================================================
    // 1. Ir buscar o Inventário Privado (Apenas para Direção/Coordenador)
    // ============================================================================
    async listarInventario() {
        const response = await fetch(`${API_URL}/inventario`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Aqui está a mochila do estafeta! Sem isto, o NestJS dá Erro 401.
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar o inventário. Verifica se tens permissão.');
        }

        return response.json();
    },

    // ============================================================================
    // 2. Ir buscar os Anúncios Públicos (O OLX da Escola)
    // ============================================================================
    async listarMarketplace() {
        const response = await fetch(`${API_URL}/marketplace`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar o marketplace.');
        }

        return response.json();
    },

    // ============================================================================
    // 3. O Botão Mágico: Publicar um artigo na Montra
    // ============================================================================
    async publicarAnuncio(idArtigo: number, quantidade: number, notas?: string) {
        const response = await fetch(`${API_URL}/${idArtigo}/publicar`, {
            method: 'PATCH', // Lembra-te, usamos PATCH no controlador do NestJS!
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            // Os dados que vão passar pela nossa "Alfândega" (DTO) no Backend
            body: JSON.stringify({
                Quantidade_A_Venda: quantidade,
                Notas_Anuncio: notas
            })
        });

        if (!response.ok) {
            // Se o backend atirar um BadRequest (ex: stock insuficiente), tentamos ler o erro
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao publicar o anúncio.');
        }

        return response.json();
    },
    // ============================================================================
    // 4. Criar um novo artigo no armazém (Direção/Coordenador)
    // ============================================================================
    async criarArtigo(novoArtigo: { Nome: string; Quantidade: number; Notas?: string }) {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(novoArtigo)
        });

        if (!response.ok) throw new Error('Erro ao criar o artigo no armazém.');
        return response.json();
    }
};