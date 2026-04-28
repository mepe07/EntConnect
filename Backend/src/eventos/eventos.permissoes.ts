// Ficheiro: Backend/src/eventos/eventos.permissoes.ts

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../auth/enums/roles.enum';

type EventoPublicoValidavel = {
    Publico: boolean;
    Publicado: boolean;
    Ativo: boolean;
} | null;

/**
 * Garante que apenas a coordenadora consegue gerir eventos.
 *
 * Nota:
 * - Ver eventos públicos não precisa desta permissão.
 * - Criar, editar, remover e reativar precisa.
 */
export function garantirPermissaoGestaoEventos(role: Role): void {
    if (role !== Role.COORDENADOR) {
        throw new ForbiddenException('Apenas a coordenadora pode gerir eventos.');
    }
}

/**
 * Garante que um evento pode ser visto numa rota pública.
 *
 * Regra:
 * - tem de existir;
 * - tem de ser público;
 * - tem de estar publicado;
 * - tem de estar ativo.
 *
 * Usamos NotFound para não revelar se o evento existe mas está privado,
 * removido ou ainda em rascunho.
 */
export function garantirEventoVisivelPublicamente<T extends EventoPublicoValidavel>(
    evento: T,
): asserts evento is NonNullable<T> {
    if (!evento || !evento.Publico || !evento.Publicado || !evento.Ativo) {
        throw new NotFoundException('Evento não encontrado.');
    }
} 