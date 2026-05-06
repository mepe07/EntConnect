

import type {
    FiltrosAnuncios,
    CriarAnuncioPayload,
    PublicarInventarioEscolaPayload,
    RegistarInteressePayload,
    EstadoAnuncio,
    Anuncio,
    Proposta,
    CriarItemInventarioPayload,
    RegistoModeracaoMarketplace,
} from '../types/marketplace.types';

import { API_BASE_URL } from "../../src/config/api.config";
import { authService } from './auth.service';


const API_URL = `${API_BASE_URL}/marketplace`;

const getAuthHeader = () => {
    const token = authService.getToken();

    return token ? { Authorization: `Bearer ${token}` } : {};
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...getAuthHeader(),
});

async function parseError(response: Response, fallback: string): Promise<never> {
    let mensagem = fallback;

    try {
        const erro = await response.json();

        if (Array.isArray(erro.message)) {
            mensagem = erro.message.join(', ');
        } else if (erro.message) {
            mensagem = erro.message;
        }
    } catch {

    }

    throw new Error(mensagem);
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

    async listarAnunciosModeracao(): Promise<Anuncio[]> {
        const response = await fetch(`${API_URL}/anuncios/moderacao`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar a fila de moderação.');
        return response.json();
    },

    async listarRegistoModeracao(): Promise<RegistoModeracaoMarketplace[]> {
        const response = await fetch(`${API_URL}/moderacao/registo`, {
            method: 'GET',
            headers: getHeaders(),
        });

        if (!response.ok) return parseError(response, 'Erro ao carregar o registo de moderação.');
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


    async criarAnuncio(dados: CriarAnuncioPayload): Promise<Anuncio> {
        const formData = new FormData();

        formData.append('titulo', dados.titulo);
        formData.append('tipoAnuncio', dados.tipoAnuncio);
        formData.append('quantidadeTotal', String(dados.quantidadeTotal));

        if (dados.quantidadeDisponivel !== undefined) {
            formData.append('quantidadeDisponivel', String(dados.quantidadeDisponivel));
        }

        if (dados.quantidadeVenda !== undefined) {
            formData.append('quantidadeVenda', String(dados.quantidadeVenda));
        }

        if (dados.quantidadeAluguer !== undefined) {
            formData.append('quantidadeAluguer', String(dados.quantidadeAluguer));
        }

        if (dados.descricao) formData.append('descricao', dados.descricao);
        if (dados.notasInternas) formData.append('notasInternas', dados.notasInternas);
        if (dados.idEstado) formData.append('idEstado', String(dados.idEstado));
        if (dados.idTamanho) formData.append('idTamanho', String(dados.idTamanho));
        if (dados.idCor) formData.append('idCor', String(dados.idCor));

        if (dados.ficheiroFoto) {
            formData.append('foto', dados.ficheiroFoto);
        }

        const response = await fetch(`${API_URL}/anuncios`, {
            method: 'POST',
            headers: getAuthHeader(),
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
        const usarMultipart = !!dados.ficheiroFoto;

        const response = await fetch(`${API_URL}/anuncios/${idArtigo}`, {
            method: 'PATCH',
            headers: usarMultipart
                ? getAuthHeader()
                : getHeaders(),
            body: usarMultipart
                ? (() => {
                    const formData = new FormData();

                    Object.entries(dados).forEach(([key, value]) => {
                        if (value === undefined || value === null || key === 'ficheiroFoto') return;
                        formData.append(key, String(value));
                    });

                    if (dados.ficheiroFoto) {
                        formData.append('foto', dados.ficheiroFoto);
                    }

                    return formData;
                })()
                : JSON.stringify(dados),
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

    async moderarAnuncio(idArtigo: number, acao: 'remover' | 'reativar' | 'arquivar', motivo?: string): Promise<Anuncio> {
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


    async criarItemInventario(dados: CriarItemInventarioPayload): Promise<Anuncio> {

        const formData = new FormData();


        formData.append('titulo', dados.titulo);


        formData.append('quantidade', String(dados.quantidade));


        if (dados.descricao) {
            formData.append('descricao', dados.descricao);
        }


        if (dados.ficheiroFoto) {
            formData.append('foto', dados.ficheiroFoto);
        }


        const response = await fetch(`${API_URL}/inventario`, {
            method: 'POST',


            headers: getAuthHeader(),
            body: formData,
        });


        if (!response.ok) return parseError(response, 'Erro ao adicionar item ao inventário.');

        return response.json();
    },
};
