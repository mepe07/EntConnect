import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../auth/enums/roles.enum';

type EventoPublicoValidavel = {
  Publico: boolean;
  Publicado: boolean;
  Ativo: boolean;
} | null;

/**
 * Executa a operacao garantir permissao gestao eventos.
 * @param role Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function garantirPermissaoGestaoEventos(role: Role): void {
  if (role !== Role.COORDENADOR) {
    throw new ForbiddenException('Apenas a coordenadora pode gerir eventos.');
  }
}

/**
 * Executa a operacao garantir evento visivel publicamente.
 * @param evento Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function garantirEventoVisivelPublicamente<
  T extends EventoPublicoValidavel,
>(evento: T): asserts evento is NonNullable<T> {
  if (!evento || !evento.Publico || !evento.Publicado || !evento.Ativo) {
    throw new NotFoundException('Evento não encontrado.');
  }
}
