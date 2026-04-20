// Ficheiro: Frontend/app/services/marketplace.service.ts

import type {
    FiltrosAnuncios,
    CriarAnuncioPayload,
    PublicarInventarioEscolaPayload,
    RegistarInteressePayload,
    EstadoAnuncio,
    Anuncio,
    Proposta,
    CriarItemInventarioPayload,
} from '../types/marketplace.types';

const API_URL = 'http://localhost:3000/marketplace';

const getToken = () => localStorage.getItem('entconnect_token');

const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

async function parseError(response: Response, fallback: string): Promise<never> {
    try {
        const erro = await response.json();
        throw new Error(erro.message || fallback);
    } catch {
        throw new Error(fallback);
    }
}

export const marketplaceService = {
    async listarAnuncios(filtros?: FiltrosAnuncios): Promise<Anuncio[]> {
        const params = new URLSearchParams();

        if (filtros) {
            Object.entries(filtros).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, String(value));
                }
            });
        }

        const response = await fetch(`${API_URL}/anuncios?${params.toString()}`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar anúncios do Marketplace.');
        return response.json();
    },

    async obterAnuncio(idArtigo: number): Promise<Anuncio> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao obter detalhe do anúncio.');
        return response.json();
    },

    async listarMeusAnuncios(): Promise<Anuncio[]> {
        const response = await fetch(`${API_URL}/meus-anuncios`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar os teus anúncios.');
        return response.json();
    },

    async listarInventarioDaEscola(): Promise<Anuncio[]> {
        const response = await fetch(`${API_URL}/inventario-escola`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar o inventário da escola.');
        return response.json();
    },

    async listarInventarioDisponivelParaPublicacao(): Promise<Anuncio[]> {
        const response = await fetch(`${API_URL}/inventario-escola/disponivel-para-publicacao`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar o inventário disponível para publicação.');
        return response.json();
    },

    // Procura o método criarAnuncio e substitui por este:
    async criarAnuncio(dados: CriarAnuncioPayload): Promise<Anuncio> {
        const formData = new FormData();

        formData.append('titulo', dados.titulo);
        formData.append('tipoAnuncio', dados.tipoAnuncio);
        formData.append('quantidadeTotal', String(dados.quantidadeTotal));
        formData.append('quantidadeDisponivel', String(dados.quantidadeTotal));
    
        if (dados.descricao) formData.append('descricao', dados.descricao);
    
        // CORREÇÃO: Usar 'notasInternas' para bater certo com o DTO do Backend
        if (dados.notasInternas) formData.append('notasInternas', dados.notasInternas);
    
        // CORREÇÃO: Enviar os IDs de Estado e Tamanho
        if (dados.idEstado) formData.append('idEstado', String(dados.idEstado));
        if (dados.idTamanho) formData.append('idTamanho', String(dados.idTamanho));

        if (dados.ficheiroFoto) {
            formData.append('foto', dados.ficheiroFoto);
        }

        const response = await fetch(`${API_URL}/anuncios`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${getToken()}`, 
            },
            body: formData,
        });

        if (!response.ok) return parseError(response, 'Erro ao criar o anúncio.');
        return response.json();
    },

    async publicarInventarioDaEscola(dados: PublicarInventarioEscolaPayload): Promise<Anuncio> {
        const response = await fetch(`${API_URL}/inventario-escola/publicar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) return parseError(response, 'Erro ao publicar artigo do inventário.');
        return response.json();
    },

    async atualizarAnuncio(idArtigo: number, dados: Partial<CriarAnuncioPayload>): Promise<Anuncio> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) return parseError(response, 'Erro ao atualizar o anúncio.');
        return response.json();
    },

    async alterarEstado(idArtigo: number, estado: EstadoAnuncio, motivo?: string): Promise<Anuncio> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}/estado`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ estado, motivo }),
        });

        if (!response.ok) return parseError(response, `Erro ao alterar o estado para ${estado}.`);
        return response.json();
    },

    async removerAnuncio(idArtigo: number): Promise<{ mensagem: string }> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao remover o anúncio.');
        return response.json();
    },

    async moderarAnuncio(idArtigo: number, acao: 'remover' | 'reativar', motivo?: string): Promise<Anuncio> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}/moderar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ acao, motivo }),
        });

        if (!response.ok) return parseError(response, 'Erro ao aplicar a moderação.');
        return response.json();
    },

    async registarInteresse(idArtigo: number, dados: RegistarInteressePayload): Promise<Proposta> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}/interesse`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) return parseError(response, 'Erro ao registar interesse no anúncio.');
        return response.json();
    },

    async listarInteressesDoAnuncio(idArtigo: number): Promise<Proposta[]> {
        const response = await fetch(`${API_URL}/anuncios/${idArtigo}/interesses`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar os interesses do anúncio.');
        return response.json();
    },

    /**
     * Cria um novo item no inventário institucional da escola.
     * Utiliza FormData em vez de JSON para suportar o upload da fotografia.
     */
    async criarItemInventario(dados: CriarItemInventarioPayload): Promise<Anuncio> {
        // Criamos a "caixa de encomenda" para suportar o ficheiro binário
        const formData = new FormData();

        // 1. Enfiamos lá dentro os dados de texto
        formData.append('titulo', dados.titulo);
        
        // CORREÇÃO SÉNIOR: Enviamos apenas a quantidade total, 
        // tal como definimos no CriarItemInventarioDto do Backend.
        formData.append('quantidade', String(dados.quantidade));
        
        // Apenas adicionamos a descrição se ela existir
        if (dados.descricao) {
            formData.append('descricao', dados.descricao);
        }

        // 2. Enfiamos o ficheiro físico (se o utilizador tiver escolhido um na UI)
        // O nome 'foto' aqui é VITAL: tem de ser EXATAMENTE o nome que o 
        // @UseInterceptors(FileInterceptor('foto')) está à espera no Controller!
        if (dados.ficheiroFoto) {
            formData.append('foto', dados.ficheiroFoto);
        }

        // 3. Fazemos o pedido ao servidor
        const response = await fetch(`${API_URL}/inventario`, {
            method: 'POST',
            // CRÍTICO: Não incluímos o 'Content-Type': 'application/json' nos headers.
            // O browser precisa de estar livre para calcular o boundary do 'multipart/form-data'.
            headers: {
                Authorization: `Bearer ${getToken()}`, // O passe VIP
            },
            body: formData, // A encomenda completa (texto + ficheiro) vai no body
        });

        // 4. Tratamento de erros padrão do nosso serviço
        if (!response.ok) return parseError(response, 'Erro ao adicionar item ao inventário.');
        
        return response.json();
    },
};
