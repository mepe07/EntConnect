// Ficheiro: src/marketplace/permissions/marketplace.permissoes.ts

import { ForbiddenException } from '@nestjs/common';

/*
    Marketplace Permissões

    Este ficheiro centraliza regras simples de autorização do módulo Marketplace.

    O objetivo é evitar espalhar verificações de role diretamente pelo service,
    mantendo o MarketplaceService mais focado no fluxo principal.

    Responsabilidades:
    - indicar se uma role pode gerir o inventário da escola;
    - indicar se uma role pode moderar anúncios;
    - lançar exceções ForbiddenException quando o utilizador não tem permissão.

    Nota:
    A validação de autenticação acontece antes, através do AuthGuard.
    A validação de role por endpoint acontece no RolesGuard.
    Estas funções existem como camada adicional de segurança dentro das regras
    de negócio do Marketplace.
*/

/*
    Verifica se a role pode gerir o inventário institucional da escola.

    Atualmente, apenas a Coordenadora pode gerir inventário.
    Esta função devolve apenas boolean e não lança erro, sendo útil em validações
    condicionais dentro do service.
*/
export function podeGerirInventarioDaEscola(role: string): boolean {
    return role === 'Coordenador';
}

/*
    Verifica se a role pode moderar anúncios do Marketplace.

    Atualmente, apenas a Coordenadora pode executar ações de moderação,
    como remover, reativar ou arquivar anúncios de terceiros.
*/
export function podeModerarMarketplace(role: string): boolean {
    return role === 'Coordenador';
}

/*
    Garante que o utilizador pode gerir o inventário da escola.

    Se a role não tiver permissão, é lançada uma ForbiddenException.
    Isto impede que utilizadores sem autorização criem, publiquem ou consultem
    dados internos do inventário institucional.
*/
export function garantirAcessoAoInventarioDaEscola(role: string): void {
    if (!podeGerirInventarioDaEscola(role)) {
        throw new ForbiddenException('Apenas a coordenadora pode gerir o inventário da escola.');
    }
}

/*
    Garante que o utilizador pode executar ações de moderação.

    Esta validação é usada antes de operações administrativas sobre anúncios,
    como consultar anúncios para moderação ou aplicar uma ação de moderação.
*/
export function garantirPermissaoDeModeracao(role: string): void {
    if (!podeModerarMarketplace(role)) {
        throw new ForbiddenException('Apenas a coordenadora pode moderar anúncios de terceiros.');
    }
} 