import { useEffect, useRef, useState } from "react";
import { authService } from "~/services/auth.service";
import logoHeader from "../../assets/media/logo_header.png";
import './header.scss';
import type { User } from "~/models/interfaces/user.interface";

export function Header() {
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
        // Se na interface for 'id', muda aqui para userInfo?.id
        const currentUserId = userInfo?.sub; 
        
        async function fetchFotoPerfil() {
            if (currentUserId) {
                try {
                    const token = localStorage.getItem('token') || authService.getToken(); 
                    
                    const response = await fetch(`http://localhost:3000/utilizador/${currentUserId}/foto`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`, 
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.url) {
                            setFotoPerfilUrl(data.url);
                        }
                    } else {
                        console.error("A API rejeitou o pedido.");
                    }
                } catch (error) {
                    console.error("Erro fatal no Fetch (Pode ser CORS):", error);
                }
            }
        }

        fetchFotoPerfil();
    }, [userInfo]); // Reage quando o estado userInfo muda

    // ... (o resto do teu código do handleClickOutside e return mantém-se igual)

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
                <img src={logoHeader} className="logo" alt="EntConnect Logo" />
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
                            userLetter
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