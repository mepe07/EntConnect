import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router"; // Importado o hook de navegação
import { authService } from "~/services/auth.service";
import { API_BASE_URL } from "~/config/api.config";
import logoHeader from "../../assets/media/logo_header.png";
import './header.scss';
import type { User } from "~/models/interfaces/user.interface";

/**
 * Cabeçalho autenticado da aplicação.
 *
 * @remarks
 * Mostra o acesso rápido à conta e sincroniza a fotografia de perfil do utilizador.
 */
export function Header() {
    // Inicializado o hook de navegação
    const navigate = useNavigate(); 
    
    // 1. Guarda a info do utilizador num estado para garantir reatividade
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [subMenuVisible, setSubMenuVisible] = useState(false);
    const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string | null>(null);
    
    const profilePictureRef = useRef<HTMLDivElement>(null);
    const subMenuRef = useRef<HTMLDivElement>(null);

    // 2. Carrega a info do utilizador apenas uma vez quando o componente monta
    useEffect(() => {
        const info = authService.getUserInfo() as User;
        
        if (info) {
            setUserInfo(info as User);
        }
    }, []);

    const userLetter = userInfo?.username ? userInfo.username.charAt(0).toUpperCase() : 'U';

    // 3. Este useEffect agora reage quando o userInfo for atualizado
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
                        // TRUQUE DA CACHE NO HEADER TAMBÉM!
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

        // 1. Vai buscar a foto a primeira vez que o Header carrega
        fetchFotoPerfil();

        // 2. Fica à escuta (Listener) de quando o Perfil avisa que a foto mudou!
        window.addEventListener('fotoPerfilAtualizada', fetchFotoPerfil);

        // 3. Limpeza do Listener quando o utilizador sai da aplicação
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

    return (
        <header>
            <div className="header-container">
                {/*3. Logo agora é clicável e redireciona para o Dashboard que é o / */}
                <img 
                    src={logoHeader} 
                    className="logo" 
                    alt="EntConnect Logo" 
                    onClick={() => navigate('/')} // o / corresponde à rota do Dashboard, que é a página principal após o login
                />
                
                <div className="menu">
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
                            /*4. A Letra Dinâmica agora está dentro de um span com a classe correta para o SCSS agarrar */
                            <span className="letra-dinamica">
                                {userLetter}
                            </span>
                        )}
                    </div>

                    <div
                        className={`sub-menu ${subMenuVisible ? "active" : ""}`}
                        ref={subMenuRef}
                    >
                        <div className='user-info'>
                            <p>{userInfo?.username}</p>
                            <p>{userInfo?.role}</p>
                        </div>
                        <a href="#" onClick={(e) => authService.logout(e)} className="logout-link">
                            <i className="fa fa-arrow-right-from-bracket"></i> Sair
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}
