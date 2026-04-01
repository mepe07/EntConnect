// Ficheiro: structure/navigation-menu/navigation-menu.tsx
import './navigation-menu.scss';
import { useLocation, Link } from 'react-router'; // Atenção: se der erro, pode ser 'react-router-dom'
import { useState } from 'react';

export function NavigationMenu() {
    const location = useLocation();
    const path = location.pathname.toLowerCase();

    const [configMenuOpen, setConfigMenuOpen] = useState(false);

    const isActive = (route: string) => {
        const normalized = route === '/' ? '/' : `/${route}`;
        return path === normalized;
    };

    const contains = (route: string) => {
        const normalized = route === '/' ? '/' : `/${route}`;
        return path.startsWith(normalized);
    };

    const isCoachingActive = path.startsWith('/coaching');

    return (
        <nav className="navigation-menu">
            <ul>
                {/* LÓGICA: O <li> agora envolve o <Link>, como mandam as regras do HTML! */}
                <li className={isActive('dashboard') || isActive('/') ? 'active' : ''}>
                    <Link to="/">Dashboard</Link>
                </li>
                
                <li className={isActive('marketplace') ? 'active' : ''}>
                    <Link to="/marketplace">Marketplace</Link>
                </li>

                <li className={isActive('faturacao') ? 'active' : ''}>
                    <Link to="/faturacao">Faturação</Link>
                </li>
                
                <li className={contains('configuracoes') ? 'active' : ''}>
                    <Link to="#" onClick={() => setConfigMenuOpen(!configMenuOpen)}>
                        Configurações
                        <i className={`fa fa-chevron-down ${contains('configuracoes') || configMenuOpen ? 'open' : ''}`}></i>
                    </Link>
                    <ul className={`submenu ${contains('configuracoes') || configMenuOpen ? 'open' : ''}`}>
                        <li className={isActive('configuracoes/utilizadores') ? 'active' : ''}>
                            <Link to="/configuracoes/utilizadores">Utilizadores</Link>
                        </li>
                        <li className={isActive('configuracoes/modalidades') ? 'active' : ''}>
                            <Link to="/configuracoes/modalidades">Modalidades</Link>
                        </li>
                    </ul>
                </li>
            </ul>
        </nav>
    );
} 