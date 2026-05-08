import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { authService } from "~/services/auth.service";
import { API_BASE_URL } from "~/config/api.config";
import logoHeader from "../../assets/media/logo_header.png";
import './header.scss';
import type { User } from "~/models/interfaces/user.interface";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";

const roleDisplayNames: Record<string, string> = {
    Coordenador: 'Coordenador',
    Professor: 'Professor',
    Enc_Educacao: 'Enc. Educação',
    EncEducacao: 'Enc. Educação',
    'Encarregado de Educação': 'Enc. Educação',
};

/**
 * Normaliza a apresentação do cargo guardado no token do utilizador.
 *
 * @param role - Cargo devolvido pela autenticação.
 * @returns Nome legível para apresentar no cabeçalho.
 */
function formatRoleName(role?: string) {
    if (!role) return '';

    return roleDisplayNames[role] ?? role.replaceAll('_', ' ');
}

/**
 * Cabeçalho autenticado da aplicação.
 *
 * @remarks
 * Mostra a identidade do utilizador, sincroniza a fotografia de perfil e
 * disponibiliza o acesso à conta e ao logout.
 */
interface HeaderProps {
    menuMobileAberto?: boolean;
    onToggleMenuMobile?: () => void;
}

export function Header({ menuMobileAberto = false, onToggleMenuMobile }: HeaderProps) {

    const navigate = useNavigate();


    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [subMenuVisible, setSubMenuVisible] = useState(false);
    const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string | null>(null);
    const [roleEmAtualizacao, setRoleEmAtualizacao] = useState(false);

    const profilePictureRef = useRef<HTMLDivElement>(null);
    const subMenuRef = useRef<HTMLDivElement>(null);
    const subMenuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelSubMenuClose = () => {
        if (subMenuCloseTimeoutRef.current) {
            clearTimeout(subMenuCloseTimeoutRef.current);
            subMenuCloseTimeoutRef.current = null;
        }
    };

    const openSubMenu = () => {
        cancelSubMenuClose();
        setSubMenuVisible(true);
    };

    const scheduleSubMenuClose = () => {
        cancelSubMenuClose();
        subMenuCloseTimeoutRef.current = setTimeout(() => {
            setSubMenuVisible(false);
            subMenuCloseTimeoutRef.current = null;
        }, 180);
    };


    useEffect(() => {
        const info = authService.getUserInfo() as User;

        if (info) {
            setUserInfo(info as User);
        }

        authService.atualizarSessao()
            .then((userAtualizado) => {
                if (userAtualizado) setUserInfo(userAtualizado);
            })
            .catch((error) => {
                console.error('Erro ao atualizar sessao:', error);
            });
    }, []);

    useEffect(() => {
        function handleRoleAlterada(event: Event) {
            const detail = (event as CustomEvent<User>).detail;
            setUserInfo(detail || authService.getUserInfo());
        }

        window.addEventListener('entconnect-role-alterada', handleRoleAlterada);

        return () => {
            window.removeEventListener('entconnect-role-alterada', handleRoleAlterada);
        };
    }, []);

    const userDisplayName = userInfo?.nome || userInfo?.username;
    const userRoleDisplayName = formatRoleName(userInfo?.role);
    const userLetter = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U';
    const rolesDisponiveis = userInfo?.roles?.length ? userInfo.roles : userInfo?.role ? [userInfo.role] : [];

    const handleTrocarRole = async (role: string) => {
        if (!role || role === userInfo?.role || roleEmAtualizacao) return;

        setRoleEmAtualizacao(true);

        try {
            const userAtualizado = await authService.trocarRole(role);
            setUserInfo(userAtualizado);
            setSubMenuVisible(false);
            navigate('/');
        } catch (error) {
            console.error('Erro ao trocar role:', error);
        } finally {
            setRoleEmAtualizacao(false);
        }
    };


    useEffect(() => {
        const currentUserId = userInfo?.sub;

        async function fetchFotoPerfil() {
            if (!currentUserId) return;

            try {
                const token = localStorage.getItem('entconnect_token') || authService.getToken();
                const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/foto`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.url) {

                        const separador = data.url.includes('?') ? '&' : '?';
                        const urlSemCache = `${data.url}${separador}t=${new Date().getTime()}`;

                        setFotoPerfilUrl(urlSemCache);
                    } else {
                        setFotoPerfilUrl(null);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar foto no Header:", error);
            }
        }


        fetchFotoPerfil();


        window.addEventListener('fotoPerfilAtualizada', fetchFotoPerfil);


        return () => {
            window.removeEventListener('fotoPerfilAtualizada', fetchFotoPerfil);
        };

    }, [userInfo]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                subMenuVisible &&
                profilePictureRef.current &&
                subMenuRef.current &&
                !profilePictureRef.current.contains(target) &&
                !subMenuRef.current.contains(target)
            ) {
                setSubMenuVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [subMenuVisible]);

    useEffect(() => {
        return () => {
            cancelSubMenuClose();
        };
    }, []);

    return (
        <header>
            <div className="header-container">

                <img
                    src={logoHeader}
                    className="logo"
                    alt="EntConnect Logo"
                    onClick={() => navigate('/')}
                />

                <button
                    type="button"
                    className={`hamburger-button ${menuMobileAberto ? 'active' : ''}`}
                    aria-label={menuMobileAberto ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={menuMobileAberto}
                    onClick={onToggleMenuMobile}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div
                    className="menu"
                    onMouseEnter={openSubMenu}
                    onMouseLeave={scheduleSubMenuClose}
                >
                    <div
                        className="profile-picture"
                        ref={profilePictureRef}
                        onClick={(e) => {
                            e.preventDefault();
                            setSubMenuVisible((v) => !v);
                        }}
                        style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {fotoPerfilUrl ? (
                            <img
                                src={fotoPerfilUrl}
                                alt="Perfil"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (

                            <span className="letra-dinamica">
                                {userLetter}
                            </span>
                        )}
                    </div>

                    <div
                        className={`sub-menu ${subMenuVisible ? "active" : ""}`}
                        ref={subMenuRef}
                        onMouseEnter={openSubMenu}
                        onMouseLeave={scheduleSubMenuClose}
                    >
                        <div className='user-info'>
                            <p>{userDisplayName}</p>
                            <p>{userRoleDisplayName}</p>
                        </div>
                        {rolesDisponiveis.length > 1 && (
                            <div className="role-switcher">
                                <select
                                    id="role-switcher"
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
                            </div>
                        )}
                        <div className="theme-switcher">
                            <span>Tema</span>
                            <ThemeToggle className="menu-theme-toggle" />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSubMenuVisible(false);
                                navigate('/conta');
                            }}
                            className="account-link"
                        >
                            <i className="fa-solid fa-user-gear"></i> A Minha Conta
                        </button>
                        <a href="#" onClick={(e) => authService.logout(e)} className="logout-link">
                            <i className="fa fa-arrow-right-from-bracket"></i> Sair
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}
