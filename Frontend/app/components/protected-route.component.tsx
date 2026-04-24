// Ficheiro: app/components/protected-route.component.tsx

import { Navigate } from 'react-router';
import { authService } from '../services/auth.service';
import type { User } from '../models/interfaces/user.interface';

import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    rolesPermitidas?: string[];
}

/**
 * Componente que protege rotas privadas.
 *
 * Primeiro valida se existe sessão ativa.
 * Depois valida permissões por role, quando a rota define roles permitidas.
 */
export function ProtectedRoute({ children, rolesPermitidas }: ProtectedRouteProps) {
    const userInfo = authService.getUserInfo() as User | null;

    // Sem userInfo significa:
    // - sem token
    // - token expirado
    // - token inválido
    if (!userInfo) {
        return <Navigate to="/login" replace />;
    }

    if (rolesPermitidas && rolesPermitidas.length > 0) {
        if (!rolesPermitidas.includes(userInfo.role)) {
            console.warn(`[Segurança] Acesso negado. A role '${userInfo.role}' não tem permissão para aceder a este ecrã.`);
            return <Navigate to="/" replace />;
        }
    }

    return children;
} 