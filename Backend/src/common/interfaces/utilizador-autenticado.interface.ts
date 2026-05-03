// Ficheiro: Backend/src/common/interfaces/utilizador-autenticado.interface.ts

/**
 * Representa o payload mínimo que o AuthGuard coloca no request.
 *
 * Nota:
 * - `sub` corresponde ao ID do Utilizador.
 * - `idPessoa` corresponde ao ID da Pessoa.
 *
 * Mantemos ambos porque a base de dados antiga usava muito o ID_Pessoa,
 * enquanto a refatoração do Marketplace passa a privilegiar um dono canónico
 * no ID do Utilizador.
 */
import { Role } from '../../auth/enums/roles.enum';

export interface UtilizadorAutenticado {
    sub: number;
    username: string;
    nome?: string;
    role: Role;
    idPessoa: number;
}
