const API_URL = 'http://localhost:3000/artigo';
const getToken = () => localStorage.getItem('entconnect_token');

export const marketplaceService = {

    async listarInventario() {
        const response = await fetch(`${API_URL}/inventario`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Falha ao carregar o inventário. Verifica se tens permissão.');
        return response.json();
    },

    async listarMarketplace() {
        const response = await fetch(`${API_URL}/marketplace`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Falha ao carregar o marketplace.');
        return response.json();
    },

    // A MONTRA: Agora atualiza a prateleira física (idStock)
    async publicarAnuncio(idStock: number, quantidadeAVenda: number) {
        const response = await fetch(`${API_URL}/${idStock}/publicar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ Quantidade_A_Venda: quantidadeAVenda })
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao publicar no Marketplace.');
        }

        return response.json();
    },

    // A CRIAÇÃO: O novo estafeta leva a caixa dupla (Catálogo + Armazém)
    async criarArtigo(novoArtigo: any) {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(novoArtigo)
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao criar o artigo no armazém.');
        }
        return response.json();
    },

    // ============================================================================
    // 5. O Botão do Coração: Adicionar/Remover Favorito
    // ============================================================================
    async alternarFavorito(idStock: number) {
        const response = await fetch(`${API_URL}/${idStock}/favorito`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Erro ao atualizar favorito.');
        return response.json();
    },

    // ============================================================================
    // 6. A Proposta: Pedir para levantar um Artigo
    // ============================================================================
    async registarInteresse(idStock: number, mensagem?: string) {
        const response = await fetch(`${API_URL}/${idStock}/interesse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ mensagem: mensagem })
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao registar interesse.');
        }
        return response.json();
    }
};