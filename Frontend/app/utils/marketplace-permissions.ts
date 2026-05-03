
/**
 * Cargos autorizados a entrar no Marketplace.
 */
export const ROLES_COM_ACESSO_AO_MARKETPLACE = [
    'Coordenador',
    'Professor',
    'Enc_Educacao',
] as const;

/**
 * Verifica se o cargo informado pode aceder ao Marketplace.
 *
 * @param role - Cargo do utilizador autenticado.
 * @returns `true` quando o cargo tem permissão de acesso.
 */
export function podeAcederMarketplace(role?: string | null): boolean {
    return ROLES_COM_ACESSO_AO_MARKETPLACE.includes((role ?? '') as (typeof ROLES_COM_ACESSO_AO_MARKETPLACE)[number]);
}

/**
 * Cargos autorizados a gerir o inventário da escola.
 */
export const ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA = ['Coordenador'] as const;

/**
 * Verifica se o cargo informado pode gerir o inventário da escola.
 *
 * @param role - Cargo do utilizador autenticado.
 * @returns `true` quando o cargo pode gerir inventário.
 */
export function podeGerirInventarioDaEscola(role?: string | null): boolean {
    return ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA.includes((role ?? '') as (typeof ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA)[number]);
}

/**
 * Verifica se o cargo informado pode moderar anúncios do Marketplace.
 *
 * @param role - Cargo do utilizador autenticado.
 * @returns `true` quando o cargo tem permissões de moderação.
 */
export function podeModerarMarketplace(role?: string | null): boolean {
    return role === 'Coordenador';
}

/**
 * Resolve o perfil funcional usado pelo Marketplace para o cargo atual.
 *
 * @param role - Cargo do utilizador autenticado.
 * @returns Nome do perfil aplicado no Marketplace.
 */
export function getPerfilMarketplace(role?: string | null): string {
    return podeModerarMarketplace(role) ? 'Coordenadora' : 'Utilizador';
}
