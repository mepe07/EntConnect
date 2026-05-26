import { Role } from '../../auth/enums/roles.enum';

export interface UtilizadorAutenticado {
  sub: number;
  username: string;
  nome?: string;
  role: Role;
  roles?: Role[];
  idPessoa: number;
  Acoes_Rapidas?: unknown;
  Quadros_Visualizacao?: unknown;
}
