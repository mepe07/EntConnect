

import { Navigate } from 'react-router';
import { authService } from '../services/auth.service';
import type { User } from '../models/interfaces/user.interface';

import type { ReactNode } from 'react';

/**
 * Propriedades do wrapper de proteção de rotas.
 */
interface ProtectedRouteProps {
    children: ReactNode;
    rolesPermitidas?: string[];
}

/**
 * Garante autenticação e, opcionalmente, valida a role autorizada para a rota.
 *
 * @param props - Conteúdo da rota e lista de roles permitidas.
 * @returns Conteúdo protegido ou redirecionamento para uma rota segura.
 */
export function ProtectedRoute({ children, rolesPermitidas }: ProtectedRouteProps) {
    const userInfo = authService.getUserInfo() as User | null;


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
