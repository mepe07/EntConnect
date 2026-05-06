/**
 * Estrutura base do utilizador autenticado usada no frontend.
 */
export interface User {
  idUtilizador: number;
  sub?: number;
  username: string;
  nome: string;
  email: string;
  role: string;
  roles?: string[];
  contacto: string;
  nif: string;
  ativo: boolean;
  idPessoa: number;
}
