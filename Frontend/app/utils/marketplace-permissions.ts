/**
 * Regras de acesso do frontend para Marketplace e Inventário.
 *
 * Objetivo:
 * - alinhar a UI com o backend
 * - evitar que a interface prometa ações que depois devolvem 403
 * - centralizar roles para não espalhar strings pelo projeto
 */

export const ROLES_COM_ACESSO_AO_MARKETPLACE = [
    'Coordenador',
    'Admin',
    'Direcao',
    'Professor',
    'Enc_Educacao',
] as const;

export function podeAcederMarketplace(role?: string | null): boolean {
    return ROLES_COM_ACESSO_AO_MARKETPLACE.includes((role ?? '') as (typeof ROLES_COM_ACESSO_AO_MARKETPLACE)[number]);
}

export const ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA = ['Coordenador'] as const;

/**
 * Nesta fase, só a coordenadora pode gerir inventário institucional.
 */
export function podeGerirInventarioDaEscola(role?: string | null): boolean {
    return ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA.includes((role ?? '') as (typeof ROLES_COM_ACESSO_AO_INVENTARIO_ESCOLA)[number]);
}

/**
 * Nesta fase, só a coordenadora pode moderar anúncios de terceiros.
 */
export function podeModerarMarketplace(role?: string | null): boolean {
    return role === 'Coordenador';
}

export function getPerfilMarketplace(role?: string | null): string {
    return podeModerarMarketplace(role) ? 'Coordenadora' : 'Utilizador';
}
