

import { Navigate } from 'react-router';
import { authService } from '../services/auth.service';
import type { User } from '../models/interfaces/user.interface';

import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    rolesPermitidas?: string[];
}


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