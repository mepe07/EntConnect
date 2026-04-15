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
    async publicarAnuncio(idStock: number, quantidadeAVenda: number, quantidadeAAlugar: number) {
        const response = await fetch(`${API_URL}/${idStock}/publicar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ 
                Quantidade_A_Venda: quantidadeAVenda,
                Quantidade_Para_Alugar: quantidadeAAlugar 
            })
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao publicar no Marketplace.');
        }

        return response.json();
    },

    // ============================================================================
    // CRIAR ARTIGO COM FOTOGRAFIA FÍSICA
    // ============================================================================
    async criarArtigo(dadosFormData: FormData) {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: {
                // 🚨 ATENÇÃO SÉNIOR: NÃO coloques 'Content-Type': 'application/json' aqui!
                // O browser vai colocar o 'multipart/form-data' automaticamente por usarmos FormData.
                'Authorization': `Bearer ${getToken()}`
            },
            body: dadosFormData // Passamos a caixa de cartão diretamente!
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao criar o artigo no inventário.');
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
    },

    // ============================================================================
    // 7. ÁREA PESSOAL: Buscar os Meus Anúncios
    // ============================================================================
    async listarMeusAnuncios() {
        const response = await fetch(`${API_URL}/meus-anuncios`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) throw new Error('Erro ao carregar os teus anúncios.');
        return response.json();
    },

    // ============================================================================
    // 8. ÁREA PESSOAL: Buscar os Meus Pedidos (Interesses)
    // ============================================================================
    async listarMeusPedidos() {
        const response = await fetch(`${API_URL}/meus-pedidos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) throw new Error('Erro ao carregar os teus pedidos.');
        return response.json();
    },
    // ============================================================================
    // 9. ALUGUER: Pedir um artigo emprestado
    // ============================================================================
    async alugarArtigo(idStock: number, dataRecolhaPrevista: string) {
        const response = await fetch(`${API_URL}/${idStock}/alugar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            // A chave 'data_recolha_prevista' TEM de ser igual ao que o Controller espera!
            body: JSON.stringify({ data_recolha_prevista: dataRecolhaPrevista })
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao processar o pedido de aluguer.');
        }
        return response.json();
    }
};