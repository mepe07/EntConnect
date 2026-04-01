// Ficheiro: structure/navigation-menu/navigation-menu.tsx
import './navigation-menu.scss';
import { useLocation, Link } from 'react-router'; 
import { useState } from 'react';

// Serviço de autenticação para obter informações do usuário (ex: role)
import { authService } from '~/services/auth.service';

export function NavigationMenu() {
    const location = useLocation();
    const path = location.pathname.toLowerCase();

    const [menuCoachingAberto, setMenuCoachingAberto] = useState(false);
    const [menuAdminAberto, setMenuAdminAberto] = useState(false); 

    // 1. LÓGICA DE IDENTIFICAÇÃO: Ler o "crachá" do utilizador
    const userInfo = authService.getUserInfo();

    // 2. LÓGICA DE AUTORIZAÇÃO: Criar variáveis para os cargos
    const isDirecao = userInfo?.role === 'Direcao';
    const isCoordenador = userInfo?.role === 'Coordenador';

    // A MÁGICA ACONTECE AQUI: A permissão junta os dois cargos com um "OU" (||)
    const podeVerAdmin = isDirecao || isCoordenador;

    const isActive = (route: string) => {
        const normalized = route === '/' ? '/' : `/${route}`;
        return path === normalized;
    };

    const isCoachingActive = path.startsWith('/coaching');

    // Para simplificar, a gaveta fica ativa se o URL começar por /admin ou /coordenador
    const isAdminActive = path.startsWith('/admin') || path.startsWith('/coordenador'); 

    return (
        <nav className="navigation-menu">
            <ul>
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
                        <svg 
                            className={`seta ${menuCoachingAberto ? 'aberta' : ''}`} 
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </li>

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

                {/* 3. LÓGICA DE PROTEÇÃO: Usamos a nossa nova variável conjunta! */}
                {podeVerAdmin && (
                    <>
                        <li className={`menu-dropdown ${isAdminActive ? 'active-parent' : ''}`}
                            onClick={() => setMenuAdminAberto(!menuAdminAberto)}>
                            <div className="dropdown-titulo">
                                <span>Administração</span>
                                <svg className={`seta ${menuAdminAberto ? 'aberta' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </li>
                        
                        {menuAdminAberto && (
                            <ul className="sub-menu-lista">
                                <li className={`sub-item ${isActive('admin/salas') ? 'active' : ''}`}>
                                    <Link to="/admin/salas">Salas</Link>
                                </li>
                                <li className={`sub-item ${isActive('admin/modalidades') ? 'active' : ''}`}>
                                    <Link to="/admin/modalidades">Modalidades</Link>
                                </li>
                            </ul>
                        )}
                    </>
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