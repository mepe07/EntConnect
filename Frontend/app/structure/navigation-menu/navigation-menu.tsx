// Ficheiro: structure/navigation-menu/navigation-menu.tsx
import './navigation-menu.scss';
import { useLocation, Link } from 'react-router'; 
import { useState } from 'react';
import { authService } from '~/services/auth.service';


// Aqui definimos os menus para cada tipo de utilizador. 
// Se no futuro quisermos adicionar uma página, só mexemos aqui, NUNCA no HTML!
const MENU_CONFIG = {
    // navBar da coordenação
    admin: [
        { titulo: 'Dashboard', path: '/' },
        { titulo: 'Gestão Utilizadores', path: '/admin/utilizadores' },
        {
            titulo: 'Infraestrutura',
            submenu: [
                { titulo: 'Gestão de Estúdios', path: '/admin/salas' },
                { titulo: 'Gestão de Modalidades', path: '/admin/modalidades' },
            ]
        },
        {
            titulo: 'Aulas & Coaching',
            submenu: [
                { titulo: 'Gerir Horário Aulas', path: '/admin/horarios' },
                { titulo: 'Gerir Coaching', path: '/admin/coaching' },
                { titulo: 'Calendário Geral', path: '/admin/calendario' },
            ]
        },
        {
            titulo: 'Professores',
            submenu: [
                { titulo: 'Gerir Professores', path: '/admin/professores' },
                { titulo: 'Disponibilidades', path: '/admin/professores-disponibilidade' },
            ]
        },
        {
            titulo: 'Marketplace & Inventário',
            submenu: [
                { titulo: 'Gerir Inventário', path: '/marketplace/inventario' },
                { titulo: 'Gerir Anúncios', path: '/marketplace/anuncios' },
            ]
        },
        {
            titulo: 'Relatórios',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
                { titulo: 'Histórico Coaching', path: '/relatorios/historico-coaching' },
                { titulo: 'Estatísticas', path: '/relatorios/estatisticas' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta' }
    ],

    // navBar do Professor
    professor: [
        { titulo: 'Dashboard', path: '/' },
        {
            titulo: 'Agenda',
            submenu: [
                { titulo: 'Disponibilidades', path: '/agenda/disponibilidades' },
                { titulo: 'Agendamentos', path: '/agenda/agendamentos' },
                { titulo: 'Propostas de Coaching', path: '/agenda/propostas' },
                { titulo: 'Confirmações', path: '/agenda/confirmacoes' },
            ]
        },
        {
            titulo: 'Relatórios',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
                { titulo: 'Coaching', path: '/relatorios/coaching' },
                { titulo: 'Estatísticas', path: '/relatorios/estatisticas' },
            ]
        },
        {
            titulo: 'Marketplace',
            submenu: [
                { titulo: 'Catálogo', path: '/marketplace/catalogo' },
                { titulo: 'Os Meus Anúncios', path: '/marketplace/meus-anuncios' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta' }
    ],

    // 👨‍👩‍👧 NavBar do Encarregado de Educação
    encarregado: [
        { titulo: 'Dashboard', path: '/' },
        {
            titulo: 'Coaching',
            submenu: [
                { titulo: 'Ver Oferta', path: '/coaching/oferta' },
                { titulo: 'Nova Proposta', path: '/coaching/nova-proposta' },
                { titulo: 'Marcações', path: '/coaching/marcacoes' },
                { titulo: 'Confirmações', path: '/coaching/confirmacoes' },
            ]
        },
        {
            titulo: 'Relatórios',
            submenu: [
                { titulo: 'Faturação', path: '/relatorios/faturacao' },
                { titulo: 'Estatísticas', path: '/relatorios/estatisticas' },
            ]
        },
        {
            titulo: 'Marketplace',
            submenu: [
                { titulo: 'Catálogo', path: '/marketplace/catalogo' },
                { titulo: 'Os Meus Anúncios', path: '/marketplace/meus-anuncios' },
            ]
        },
        { titulo: 'A Minha Conta', path: '/conta' }
    ]
};

export function NavigationMenu() {
    const location = useLocation();
    const path = location.pathname.toLowerCase(); // helper

    // LÓGICA DE SÉNIOR: Em vez de termos 10 states (menuAdminAberto, menuCoachingAberto...), 
    // guardamos apenas o NOME do menu que está aberto no momento.
    const [menuAberto, setMenuAberto] = useState<string | null>(null);

    // 1. Descobrir quem é o utilizador
    const userInfo = authService.getUserInfo();

    /*
    * Diz erro no role, mas isso é do TypeScript, 
    * que não sabe que o token tem um campo "role".
    * O JWT guarda essa informação
    * ex:
    * {
    * "sub": 1,
    * "name": "coord01",
    * "role": "Coordenador", <--- aqui está a role
    * "iat": 1775074104
    *  "exp": 1775081304
    */
    const roleDoUser = userInfo?.role; 


    // Entregamos o Role Encarregado por default, questões de segurança
    let menuAtivo = MENU_CONFIG.encarregado; 
    
    // aqui trocamos caso seja um professor ou coordenadora, para mostrar o menu certo
    if (roleDoUser === 'Direcao' || roleDoUser === 'Coordenador' || roleDoUser === 'Admin') {
        menuAtivo = MENU_CONFIG.admin;
    } else if (roleDoUser === 'Professor') {
        menuAtivo = MENU_CONFIG.professor;
    } else if (roleDoUser === 'EncEducacao') {
        menuAtivo = MENU_CONFIG.encarregado;
    }

    // Funções auxiliares para saber se a aba está ativa
    const isActive = (route: string) => path === route;
    const isSubmenuActive = (submenu: any[]) => submenu.some(item => path === item.path);

    // Função que abre e fecha a navBar. Se clicarmos num menu que já está aberto, fecha. Se clicarmos noutro, fecha o anterior e abre o novo.
    const toggleMenu = (titulo: string) => {
        if (menuAberto === titulo) {
            setMenuAberto(null); // Fecha se já estiver aberto
        } else {
            setMenuAberto(titulo); // Abre o novo
        }
    };

    return (
        <nav className="navigation-menu">
            <ul>
                {/* Vamos percorrer o array(.Map) do menu do utilizador e desenhar as linhas no ecrã */}
                {menuAtivo.map((item, index) => {
                    
                    // É um link direto (Dashboard, Gestão Utilizadores)
                    if (item.path && !item.submenu) {
                        return (
                            <li key={index} className={isActive(item.path) ? 'active' : ''}>
                                <Link to={item.path}>{item.titulo}</Link>
                            </li>
                        );
                    }

                    // É com submenus (Infraestrutura, Aulas)
                    if (item.submenu) {
                        const isAberto = menuAberto === item.titulo || isSubmenuActive(item.submenu);
                        
                        return (
                            <li key={index} className={`menu-dropdown ${isSubmenuActive(item.submenu) ? 'active-parent' : ''}`}>
                                <div className="dropdown-titulo" onClick={() => toggleMenu(item.titulo)}>
                                    <span>{item.titulo}</span>
                                    <svg 
                                        className={`seta ${isAberto ? 'aberta' : ''}`} 
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                
                                {/* Escrita dos Submenus */}
                                <ul className={`submenu ${isAberto ? 'open' : ''}`}>
                                    {item.submenu.map((subItem, subIndex) => (
                                        <li key={subIndex} className={`sub-item ${isActive(subItem.path) ? 'active' : ''}`}>
                                            <Link to={subItem.path}>{subItem.titulo}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    }

                    return null;
                })}
            </ul>
        </nav>
    );
} 