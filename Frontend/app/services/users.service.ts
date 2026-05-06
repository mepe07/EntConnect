import { API_BASE_URL } from "../../src/config/api.config";
import { authService } from './auth.service';

/**
 * Dados necessários para criar um utilizador.
 */
export interface CreateUtilizadorPayload {
    nome: string;
    username: string;
    email: string;
    contacto?: string;
    nif?: string;
    dataNascimento: string;
    cargo?: string;
    cargos?: string[];
    password: string;
}

/**
 * Impacto calculado antes de remover associações de um encarregado de educação.
 */
export interface ImpactoRemocaoAssociacoesEncarregado {
    alunosAssociados: number;
    inscricoesCoachingAssociadas: number;
}

/**
 * Erro usado quando a alteração de cargo exige confirmação adicional.
 */
export class ConfirmacaoRemocaoAssociacoesEncarregadoError extends Error {
    impacto: ImpactoRemocaoAssociacoesEncarregado;

    constructor(message: string, impacto: ImpactoRemocaoAssociacoesEncarregado) {
        super(message);
        this.name = 'ConfirmacaoRemocaoAssociacoesEncarregadoError';
        this.impacto = impacto;
    }
}

/**
 * Dados de um aluno associado a um encarregado de educação.
 */
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

/**
 * Payload usado para criar ou atualizar educandos.
 */
export interface UpsertEducandoPayload {
    nome: string;
    dataNascimento: string;
    nif: string;
    mail?: string;
    contato?: string;
}

/**
 * Serviço responsável pela gestão de utilizadores, fotografias e educandos.
 */
export class UtilizadorService {


    private _apiUrl = API_BASE_URL;

    /**
     * Headers JSON autenticados para endpoints privados de utilizadores.
     */
    private getJsonHeaders() {
        const token = authService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    /**
     * Headers autenticados para upload de ficheiros.
     * Não define Content-Type porque o browser trata do boundary do FormData.
     */
    private getMultipartHeaders() {
        const token = authService.getToken();

        return token ? { Authorization: `Bearer ${token}` } : {};
    }


    /**
     * Obtém todos os utilizadores registados.
     *
     * @returns Lista de utilizadores devolvida pela API.
     */
    async getUsers() {
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'GET',
            headers: this.getJsonHeaders()
        });
        return await response.json();
    }


    /**
     * Cria um novo utilizador.
     *
     * @param payload - Dados do utilizador a criar.
     * @returns Utilizador criado pela API.
     */
    async createUser(payload: CreateUtilizadorPayload) {
        const response = await fetch(`${this._apiUrl}/utilizador`, {
            method: 'POST',
            headers: this.getJsonHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao criar o utilizador.');
        }

        return await response.json();
    }


    /**
     * Bloqueia o acesso de um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @returns Resposta da API.
     */
    async blockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/block`, {
            method: 'PATCH',
            headers: this.getJsonHeaders(),
        });
        return await response.json();
    }


    /**
     * Reativa o acesso de um utilizador bloqueado.
     *
     * @param userId - Identificador do utilizador.
     * @returns Resposta da API.
     */
    async unlockUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/unlock`, {
            method: 'PATCH',
            headers: this.getJsonHeaders(),
        });
        return await response.json();
    }


    /**
     * Obtém a fotografia de perfil de um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @returns Dados da fotografia devolvidos pela API.
     */
    async getFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/foto`, {
            method: 'GET',
            headers: this.getJsonHeaders(),
        });
        return await response.json();
    }


    /**
     * Envia uma nova fotografia de perfil.
     *
     * @param userId - Identificador do utilizador.
     * @param file - Ficheiro de imagem.
     * @returns Dados da fotografia atualizada.
     */
    async uploadFoto(userId: number, file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/uploadphoto`, {
            method: 'PUT',
            headers: this.getMultipartHeaders(),
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao fazer upload da foto.');
        }

        return await response.json();
    }


    /**
     * Remove a fotografia de perfil de um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @returns Resposta da API.
     */
    async removerFoto(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/removephoto`, {
            method: 'PATCH',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao remover a foto.');
        }

        return await response.json();
    }

    /**
     * Elimina um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @returns Resposta da API.
     */
    async deleteUser(userId: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}`, {
            method: 'DELETE',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao eliminar o utilizador.');
        }

        return await response.json();
    }

    /**
     * Atualiza o cargo de um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @param cargo - Novo cargo.
     * @param confirmarRemocaoAssociacoes - Confirma a remoção de associações dependentes.
     * @returns Utilizador atualizado.
     */
    async updateCargo(userId: number, cargo: string | string[], confirmarRemocaoAssociacoes = false) {
        const body = Array.isArray(cargo)
            ? { cargos: cargo, confirmarRemocaoAssociacoes }
            : { cargo, confirmarRemocaoAssociacoes };
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/update-cargo`, {
            method: 'PUT',
            headers: this.getJsonHeaders(),
            body: JSON.stringify(body),
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

    /**
     * Atualiza dados pessoais editáveis.
     *
     * @param userId - Identificador do utilizador.
     * @param dados - Campos pessoais a atualizar.
     * @returns Utilizador atualizado.
     */
    async updatePessoal(userId: number, dados: { nome?: string; contacto?: string; nif?: string }) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/update-pessoal`, {
            method: 'PUT',
            headers: this.getJsonHeaders(),
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar os dados pessoais.');
        }

        return await response.json();
    }

    /**
     * Atualiza a password de um utilizador.
     *
     * @param userId - Identificador do utilizador.
     * @param newPassword - Nova password.
     * @returns Resposta da API.
     */
    async updatePassword(userId: number, newPassword: string) {
        const response = await fetch(`${this._apiUrl}/utilizador/${userId}/password`, {
            method: 'PATCH',
            headers: this.getJsonHeaders(),
            body: JSON.stringify({ password: newPassword }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar a password.');
        }

        return await response.json();
    }

    /**
     * Lista os educandos associados a um encarregado de educação.
     *
     * @param idEncEducacao - Identificador do encarregado de educação.
     * @returns Educandos associados.
     */
    async getEducandos(idEncEducacao: number): Promise<Educando[]> {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'GET',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao obter os educandos.');
        }

        return await response.json();
    }

    /**
     * Lista alunos que ainda não têm encarregado de educação associado.
     *
     * @returns Alunos disponíveis para associação.
     */
    async getAlunosSemEncarregado(): Promise<Educando[]> {
        const response = await fetch(`${this._apiUrl}/utilizador/alunos/sem-encarregado`, {
            method: 'GET',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao obter alunos sem encarregado.');
        }

        return await response.json();
    }

    /**
     * Cria um educando associado a um encarregado de educação.
     *
     * @param idEncEducacao - Identificador do encarregado de educação.
     * @param payload - Dados do educando.
     * @returns Educando criado.
     */
    async createEducando(idEncEducacao: number, payload: UpsertEducandoPayload): Promise<Educando> {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`, {
            method: 'POST',
            headers: this.getJsonHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao adicionar o educando.');
        }

        return await response.json();
    }

    /**
     * Atualiza um educando associado a um encarregado de educação.
     *
     * @param idEncEducacao - Identificador do encarregado de educação.
     * @param idAluno - Identificador do aluno.
     * @param payload - Dados a atualizar.
     * @returns Educando atualizado.
     */
    async updateEducando(idEncEducacao: number, idAluno: number, payload: UpsertEducandoPayload): Promise<Educando> {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}`, {
            method: 'PUT',
            headers: this.getJsonHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao atualizar o educando.');
        }

        return await response.json();
    }

    /**
     * Remove a associação de um educando a um encarregado de educação.
     *
     * @param idEncEducacao - Identificador do encarregado de educação.
     * @param idAluno - Identificador do aluno.
     * @returns Resposta da API.
     */
    async removeEducando(idEncEducacao: number, idAluno: number) {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}`, {
            method: 'DELETE',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao remover o educando.');
        }

        return await response.json();
    }

    /**
     * Associa um aluno existente a um encarregado de educação.
     *
     * @param idEncEducacao - Identificador do encarregado de educação.
     * @param idAluno - Identificador do aluno.
     * @returns Educando associado.
     */
    async associateEducando(idEncEducacao: number, idAluno: number): Promise<Educando> {
        const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos/${idAluno}/associar`, {
            method: 'PATCH',
            headers: this.getJsonHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error?.message ?? 'Erro ao associar o educando.');
        }

        return await response.json();
    }
}
