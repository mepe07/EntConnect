import { Role } from '../../auth/enums/roles.enum';

export interface UtilizadorAutenticado {
  sub: number;
  username: string;
  nome?: string;
  role: Role;
  idPessoa: number;
}
