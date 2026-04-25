// Ficheiro: Backend/src/eventos/eventos.permissoes.ts

import { ForbiddenException } from '@nestjs/common';
import { Role } from '../auth/enums/roles.enum';

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