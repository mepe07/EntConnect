import { ButtonComponent } from '~/components/button/button.component';

import './navigation-menu.scss';
import { useLocation, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { authService } from '~/services/auth.service';
import type { MenuConfig } from '../../models/interfaces/menu.interface';
import type { User } from '../../models/interfaces/user.interface';
import { ThemeToggle } from '~/components/theme-toggle/theme-toggle';


const MENU_CONFIG: MenuConfig = {


    coordenacao: [
        { titulo: 'Dashboard', path: '/', icone: 'fa-solid fa-chart-pie' },
        { titulo: 'Gestão de Eventos', path: '/admin/eventos', icone: 'fa-solid fa-calendar-days' },
        { titulo: 'Gestão Utilizadores', path: '/admin/utilizadores', icone: 'fa-solid fa-users' },
        {
            titulo: 'Infraestrutura',
            icone: 'fa-solid fa-building',
            submenu: [
                { titulo: 'Gestão de Estúdios', path: '/admin/salas' },
                { titulo: 'Gestão de Modalidades', path: '/admin/modalidades' },
            ]
        },
        {
            titulo: 'Aulas & Coaching',
            icone: 'fa-solid fa-chalkboard-user',
            submenu: [
                { titulo: 'Gerir Horário Aulas', path: '/admin/horarios' },
                { titulo: 'Gerir Coaching', path: '/admin/coaching' },
                { titulo: 'Gerir pagamentos', path: '/admin/pagamentos-coaching' },
                { titulo: 'Calendário Geral', path: '/admin/calendario' },
            ]
        },
        {
            titulo: 'Professores',
            icone: 'fa-solid fa-user-tie',
            submenu: [
                { titulo: 'Gerir Professores', path: '/admin/professores' },
                { titulo: 'Disponibilidades', path: '/admin/professores-disponibilidade' },
            ]
        },
        {
            titulo: 'Marketplace & Inventário',
            icone: 'fa-solid fa-store',
            submenu: [
                { titulo: 'Gerir Inventário', path: '/marketplace/inventario' },
                { titulo: 'Marketplace', path: '/marketplace/anuncios' },
                { titulo: 'Registo de Moderação', path: '/marketplace/atividades' },
            ]
        },
        {
            titulo: 'Relatórios',
            icone: 'fa-solid fa-file-invoice-dollar',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
                { titulo: 'Histórico Coaching', path: '/relatorios/historico-coaching' },
                { titulo: 'Estatísticas', path: '/relatorios/estatisticas' },
                { titulo: 'Consultar Agendas', path: '/relatorioCoaching' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta', icone: 'fa-solid fa-user-gear' }
    ],


    professor: [
        { titulo: 'Dashboard', path: '/', icone: 'fa-solid fa-chart-pie' },
        {
            titulo: 'Agenda',
            icone: 'fa-regular fa-calendar-days',
            submenu: [
                { titulo: 'Disponibilidades', path: '/agenda/disponibilidades' },
                { titulo: 'Agendamentos', path: '/agenda/agendamentos' },
                { titulo: 'Confirmações', path: '/agenda/confirmacoes' },
            ]
        },
        {
            titulo: 'Relatórios',
            icone: 'fa-solid fa-file-invoice-dollar',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
                { titulo: 'Coaching', path: '/relatorios/relatorioCoaching' },
            ]
        },
        {
            titulo: 'Marketplace',
            icone: 'fa-solid fa-store',
            submenu: [
                { titulo: 'Marketplace', path: '/marketplace/anuncios' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta', icone: 'fa-solid fa-user-gear' }
    ],


    encarregado: [
        { titulo: 'Dashboard', path: '/', icone: 'fa-solid fa-chart-pie' },
        { titulo: 'Educandos', path: '/educandos', icone: 'fa-solid fa-user-graduate' },
        {
            titulo: 'Coaching',
            icone: 'fa-solid fa-handshake-angle',
            submenu: [
                { titulo: 'Ver Oferta', path: '/coaching/oferta' },
                { titulo: 'Marcações', path: '/coaching/marcacoes' },
                { titulo: 'Confirmações', path: '/coaching/confirmacoes' },
            ]
        },
        {
            titulo: 'Relatórios',
            icone: 'fa-solid fa-file-invoice-dollar',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
            ]
        },
        {
            titulo: 'Marketplace',
            icone: 'fa-solid fa-store',
            submenu: [
                { titulo: 'Marketplace', path: '/marketplace/anuncios' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta', icone: 'fa-solid fa-user-gear' }
    ]
};

const roleDisplayNames: Record<string, string> = {
    Coordenador: 'Coordenador',
    Professor: 'Professor',
    Enc_Educacao: 'Enc. Educacao',
    EncEducacao: 'Enc. Educacao',
    'Encarregado de Educacao': 'Enc. Educacao',
};

function formatRoleName(role?: string) {
    if (!role) return '';

    return roleDisplayNames[role] ?? role.replaceAll('_', ' ');
}

interface NavigationMenuProps {
    menuMobileAberto?: boolean;
    onCloseMenuMobile?: () => void;
    menuDesktopColapsado?: boolean;
    onToggleMenuDesktop?: () => void;
}


export function NavigationMenu({
    menuMobileAberto = false,
    onCloseMenuMobile,
    menuDesktopColapsado = false,
    onToggleMenuDesktop,
}: NavigationMenuProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname.toLowerCase();


    const [menuAberto, setMenuAberto] = useState<string | null>(null);
    const [roleEmAtualizacao, setRoleEmAtualizacao] = useState(false);

    const userInfo = authService.getUserInfo() as User;
    const roleDoUser = userInfo?.role;
    const userDisplayName = userInfo?.nome || userInfo?.username;
    const userRoleDisplayName = formatRoleName(userInfo?.role);
    const userLetter = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U';
    const rolesDisponiveis = userInfo?.roles?.length ? userInfo.roles : userInfo?.role ? [userInfo.role] : [];


    let menuAtivo = MENU_CONFIG.encarregado;


    if (roleDoUser === 'Coordenador') {
        menuAtivo = MENU_CONFIG.coordenacao;
    } else if (roleDoUser === 'Professor') {
        menuAtivo = MENU_CONFIG.professor;
    } else if (roleDoUser === 'EncEducacao' || roleDoUser === 'Enc_Educacao') {
        menuAtivo = MENU_CONFIG.encarregado;
    }

    if ((roleDoUser === 'Professor' || roleDoUser === 'Enc_Educacao' || roleDoUser === 'EncEducacao') && Array.isArray(menuAtivo)) {
        menuAtivo = menuAtivo.map((item: any) => {
            if (item.titulo === 'Marketplace & Inventário' && item.submenu) {
                return {
                    ...item,
                    submenu: item.submenu.filter((subItem: any) => subItem.path !== '/marketplace/inventario'),
                };
            }
            return item;
        });
    }


    const isActive = (route: string) => path === route;
    const isSubmenuActive = (submenu: any[]) => submenu.some(item => path === item.path);


    const toggleMenu = (titulo: string) => {
        setMenuAberto(menuAberto === titulo ? null : titulo);
    };

    const handleTrocarRole = async (role: string) => {
        if (!role || role === userInfo?.role || roleEmAtualizacao) return;

        setRoleEmAtualizacao(true);

        try {
            await authService.trocarRole(role);
            onCloseMenuMobile?.();
            navigate('/');
        } catch (error) {
            console.error('Erro ao trocar role:', error);
        } finally {
            setRoleEmAtualizacao(false);
        }
    };

    return (
        <nav
            className={`navigation-menu ${menuMobileAberto ? 'mobile-open' : ''} ${menuDesktopColapsado ? 'collapsed' : ''}`}
            aria-label="Menu principal"
        >
            <div className="mobile-user-menu">
                <div className="mobile-user-avatar">{userLetter}</div>
                <div className="mobile-user-details">
                    <strong>{userDisplayName}</strong>
                    <span>{userRoleDisplayName}</span>
                </div>
                <ThemeToggle className="mobile-theme-toggle" />
                {rolesDisponiveis.length > 1 && (
                    <label className="mobile-role-switcher">
                        <span>Cargo ativo</span>
                        <select
                            value={userInfo?.role || ''}
                            disabled={roleEmAtualizacao}
                            onChange={(event) => handleTrocarRole(event.target.value)}
                        >
                            {rolesDisponiveis.map((role) => (
                                <option key={role} value={role}>
                                    {formatRoleName(role)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="mobile-user-actions">
                    <ButtonComponent
                        type="button"
                        onClick={() => {
                            onCloseMenuMobile?.();
                            navigate('/conta');
                        }}
                    >
                        <i className="fa-solid fa-user-gear"></i>
                        <span>A Minha Conta</span>
                    </ButtonComponent>
                    <a href="#" onClick={(e) => authService.logout(e)}>
                        <i className="fa fa-arrow-right-from-bracket"></i>
                        <span>Sair</span>
                    </a>
                </div>
            </div>
            <ul>

                {(menuAtivo || []).map((item, index) => {


                    if (item.path && !item.submenu) {
                        return (
                            <li key={index} className={isActive(item.path) ? 'active' : ''}>
                                <Link to={item.path} onClick={onCloseMenuMobile} title={menuDesktopColapsado ? item.titulo : undefined}>
                                    <div className="item-content">
                                        {item.icone && <i className={item.icone}></i>}
                                        <span>{item.titulo}</span>
                                    </div>
                                </Link>
                            </li>
                        );
                    }


                    if (item.submenu) {
                        const isAberto = menuAberto === item.titulo || isSubmenuActive(item.submenu);

                        return (
                            <li key={index} className={`menu-dropdown ${isSubmenuActive(item.submenu) ? 'active-parent' : ''}`}>
                                <div
                                    className="dropdown-titulo"
                                    title={menuDesktopColapsado ? item.titulo : undefined}
                                    onClick={() => {
                                        if (menuDesktopColapsado) {
                                            onToggleMenuDesktop?.();
                                            setMenuAberto(item.titulo);
                                            return;
                                        }

                                        toggleMenu(item.titulo);
                                    }}
                                >
                                    <div className="item-content">
                                        {item.icone && <i className={item.icone}></i>}
                                        <span>{item.titulo}</span>
                                    </div>
                                    <svg
                                        className={`seta ${isAberto ? 'aberta' : ''}`}
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>


                                <ul className={`submenu ${isAberto ? 'open' : ''}`}>
                                    {item.submenu?.map((subItem, subIndex) => (
                                        <li key={subIndex} className={`sub-item ${isActive(subItem.path || '') ? 'active' : ''}`}>
                                            <Link to={subItem.path || '#'} onClick={onCloseMenuMobile}>
                                                {subItem.icone && <i className={subItem.icone}></i>}
                                                <span>{subItem.titulo}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    }

                    return null;
                })}
            </ul>
            <div className="desktop-collapse-control">
                <ButtonComponent
                    type="button"
                    className="sidebar-collapse-button"
                    aria-label={menuDesktopColapsado ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
                    aria-expanded={!menuDesktopColapsado}
                    title={menuDesktopColapsado ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
                    onClick={onToggleMenuDesktop}
                >
                    <i className={`fa-solid ${menuDesktopColapsado ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
                </ButtonComponent>
            </div>
        </nav>
    );
}
