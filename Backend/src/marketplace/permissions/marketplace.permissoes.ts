import { ForbiddenException } from '@nestjs/common';

/**
 * Executa a operacao pode gerir inventario da escola.
 * @param role Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function podeGerirInventarioDaEscola(role: string): boolean {
  return role === 'Coordenador';
}

/**
 * Executa a operacao pode moderar marketplace.
 * @param role Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function podeModerarMarketplace(role: string): boolean {
  return role === 'Coordenador';
}

/**
 * Executa a operacao garantir acesso ao inventario da escola.
 * @param role Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function garantirAcessoAoInventarioDaEscola(role: string): void {
  if (!podeGerirInventarioDaEscola(role)) {
    throw new ForbiddenException(
      'Apenas a coordenadora pode gerir o inventário da escola.',
    );
  }
}

/**
 * Executa a operacao garantir permissao de moderacao.
 * @param role Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function garantirPermissaoDeModeracao(role: string): void {
  if (!podeModerarMarketplace(role)) {
    throw new ForbiddenException(
      'Apenas a coordenadora pode moderar anúncios de terceiros.',
    );
  }
}
