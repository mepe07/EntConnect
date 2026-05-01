import { API_BASE_URL } from '~/config/api.config';

export interface CreateUtilizadorPayload {
    nome: string;
    username: string;
    email: string;
    contacto?: string;
    nif?: string;
    dataNascimento: string;
    cargo: string;
    password: string;
}

export interface ImpactoRemocaoAssociacoesEncarregado {
    alunosAssociados: number;
    inscricoesCoachingAssociadas: number;
}

export class ConfirmacaoRemocaoAssociacoesEncarregadoError extends Error {
    impacto: ImpactoRemocaoAssociacoesEncarregado;

    constructor(message: string, impacto: ImpactoRemocaoAssociacoesEncarregado) {
        super(message);
        this.name = 'ConfirmacaoRemocaoAssociacoesEncarregadoError';
        this.impacto = impacto;
    }
}

export interface Educando {
    ID_aluno: number;
    ID_Enc_Educacao?: number | null;
    Nome: string;
    Data_Nascimento: string;
    NIF: string;
    Mail?: string | null;
    Contato?: string | null;
    Menor_Idade: boolean;
}

export interface UpsertEducandoPayload {
    nome: string;
    dataNascimento: string;
    nif: string;
    mail?: string;
    contato?: string;
}

export class UtilizadorService {
    // URL base da API.
    // Vem do ficheiro .env do frontend através de VITE_API_URL.
    private _apiUrl = API_BASE_URL;

    /**
     * Obtém a lista de utilizadores da API.
     */
    async getUsers() {
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    }

    /**
     * Cria um novo utilizador.
     */
    async createUser(payload: CreateUtilizadorPayload) {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao criar o utilizador.');
        }

        return await response.json();
    }

    /**
     * Bloqueia um utilizador com base no seu ID.
     */
    async blockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/block`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }

    /**
     * Desbloqueia um utilizador com base no seu ID.
     */
    async unlockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/unlock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }

    /**
     * Obtém o URL da foto de perfil de um utilizador.
     */
    async getFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/foto`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }

    /**
     * Faz upload de uma foto de perfil para um utilizador.
     * Usa multipart/form-data, tal como o backend espera.
     */
    async uploadFoto(userId: number, file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/uploadphoto`, {
            method: 'PUT',
            body: formData,
            // Não definir Content-Type: o browser define automaticamente com o boundary correto
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao fazer upload da foto.');
        }

        return await response.json();
    }

    /**
     * Remove a foto de perfil de um utilizador.
     */
    async removerFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/removephoto`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao remover a foto.');
        }

        return await response.json();
    }

    async deleteUser(userId: number) {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao eliminar o utilizador.');
        }

        return await response.json();
    }

    async updateCargo(userId: number, cargo: string, confirmarRemocaoAssociacoes = false) {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/update-cargo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ cargo, confirmarRemocaoAssociacoes }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 409 && error?.code === 'CONFIRMACAO_REMOCAO_ASSOCIACOES_ENCARREGADO') {
                throw new ConfirmacaoRemocaoAssociacoesEncarregadoError(
                    error?.message ?? 'Esta alteracao remove associacoes de encarregado de educacao.',
                    error?.impacto ?? { alunosAssociados: 0, inscricoesCoachingAssociadas: 0 },
                );
            }
            throw new Error(error?.message ?? 'Erro ao atualizar o cargo.');
        }

        return await response.json();
    }

    async updatePessoal(userId: number, dados: { nome?: string; contacto?: string; nif?: string }) {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/update-pessoal`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar os dados pessoais.');
        }

        return await response.json();
    }

    async updatePassword(userId: number, newPassword: string) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar a password.');
        }

        return await response.json();
    }

    async getEducandos(idEncEducacao: number): Promise<Educando[]> {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao obter os educandos.');
        }

        return await response.json();
    }

    async getAlunosSemEncarregado(): Promise<Educando[]> {
        const response = await fetch(`${this._apiUrl}/utilizador/alunos/sem-encarregado`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao obter alunos sem encarregado.');
        }

        return await response.json();
    }

    async createEducando(idEncEducacao: number, payload: UpsertEducandoPayload): Promise<Educando> {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao adicionar o educando.');
        }

        return await response.json();
    }

    async updateEducando(idEncEducacao: number, idAluno: number, payload: UpsertEducandoPayload): Promise<Educando> {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar o educando.');
        }

        return await response.json();
    }

    async removeEducando(idEncEducacao: number, idAluno: number) {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao remover o educando.');
        }

        return await response.json();
    }

    async associateEducando(idEncEducacao: number, idAluno: number): Promise<Educando> {
        const token = localStorage.getItem('entconnect_token');
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}/associar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao associar o educando.');
        }

        return await response.json();
    }
}
