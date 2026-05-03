// Ficheiro: Backend/src/marketplace/marketplace.permissoes.ts

import { ForbiddenException } from '@nestjs/common';

/**
 * Centraliza as permissões do módulo Marketplace.
 *
 * Nesta fase, a coordenadora é a única utilizadora com permissões de moderação
 * e acesso ao inventário institucional da escola.
 */
export function podeGerirInventarioDaEscola(role: string): boolean {
    return role === 'Coordenador';
}

export function podeModerarMarketplace(role: string): boolean {
    return role === 'Coordenador';
}

export function garantirAcessoAoInventarioDaEscola(role: string): void {
    if (!podeGerirInventarioDaEscola(role)) {
        throw new ForbiddenException('Apenas a coordenadora pode gerir o inventário da escola.');
    }
}

export function garantirPermissaoDeModeracao(role: string): void {
    if (!podeModerarMarketplace(role)) {
        throw new ForbiddenException('Apenas a coordenadora pode moderar anúncios de terceiros.');
    }
}
