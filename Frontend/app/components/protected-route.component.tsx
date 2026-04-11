// Ficheiro: app/components/protected-route.component.tsx
import { Navigate } from 'react-router';
import { authService } from '../services/auth.service';
import type { User } from '../models/interfaces/user.interface';

import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    rolesPermitidas?: string[]; // Se não enviares roles, basta estar logado para entrar
}

/**
 * Componente Wrapper que atua como um Porteiro para rotas sensíveis.
 * Verifica o JWT do utilizador e redireciona-o caso não tenha autorização.
 */
export function ProtectedRoute({ children, rolesPermitidas }: ProtectedRouteProps) {
    const userInfo = authService.getUserInfo() as User;

    // 1. O utilizador nem sequer fez login? Expulsa-o para a rua!
    if (!userInfo) {
        return <Navigate to="/login" replace />; // Redireciona para a página de login, replace evita que o utilizador volte para a página protegida usando o botão "Voltar"
    }

    // 2. O utilizador fez login, mas tem o cargo errado para esta sala VIP? Expulsa-o para a Dashboard!
    if (rolesPermitidas && rolesPermitidas.length > 0) {
        if (!rolesPermitidas.includes(userInfo.role)) {
            console.warn(`[Segurança] Acesso negado. A role '${userInfo.role}' não tem permissão para aceder a este ecrã.`);
            return <Navigate to="/" replace />; // Volta para a Home, replace evita que o utilizador volte para a página protegida usando o botão "Voltar"
        }
    }

    // 3. Tudo em ordem? O segurança abre a porta e deixa o React renderizar o ecrã (children)
    return children;
} 