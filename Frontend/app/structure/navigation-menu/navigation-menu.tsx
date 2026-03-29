// Ficheiro: structure/navigation-menu/navigation-menu.tsx
import './navigation-menu.scss';
import { useLocation, Link } from 'react-router'; // Atenção: se der erro, pode ser 'react-router-dom'
import { useState } from 'react';

export function NavigationMenu() {
    const location = useLocation();
    const path = location.pathname.toLowerCase();

    const [menuCoachingAberto, setMenuCoachingAberto] = useState(false);

    const isActive = (route: string) => {
        const normalized = route === '/' ? '/' : `/${route}`;
        return path === normalized;
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
        
                {/* === O ACORDEÃO (COACHING) === */}
                <li 
                    className={`menu-dropdown ${isCoachingActive ? 'active-parent' : ''}`}
                    onClick={() => setMenuCoachingAberto(!menuCoachingAberto)}
                >
                    <div className="dropdown-titulo">
                        <span>Coaching</span>
                        {/* SUBSTITUÍMOS O FONT-AWESOME POR UM SVG PURO (Adeus quadrado feio!) */}
                        <svg 
                            className={`seta ${menuCoachingAberto ? 'aberta' : ''}`} 
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </li>

                {/* AS SUB-OPÇÕES DO COACHING */}
                {menuCoachingAberto && (
                    <ul className="sub-menu-lista">
                        <li className={`sub-item ${isActive('coaching/horarios') ? 'active' : ''}`}>
                            <Link to="/coaching/horarios">Horários</Link>
                        </li>
                        <li className={`sub-item ${isActive('coaching/professores') ? 'active' : ''}`}>
                            <Link to="/coaching/professores">Professores</Link>
                        </li>
                        <li className={`sub-item ${isActive('coaching/faturacao-atraso') ? 'active' : ''}`}>
                            <Link to="/coaching/faturacao-atraso">Faturação em Atraso</Link>
                        </li>
                    </ul>
                )}
                {/* ========================================= */}

                <li className={isActive('faturacao') ? 'active' : ''}>
                    <Link to="/faturacao">Faturação</Link>
                </li>
                
                <li className={isActive('configuracoes') ? 'active' : ''}>
                    <Link to="/configuracoes">Configurações</Link>
                </li>
            </ul>
        </nav>
    );
} 