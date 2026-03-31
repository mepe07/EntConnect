import { useEffect, useRef, useState } from "react";
import { AuthService } from "~/services/auth.service";
import logoHeader from "../../assets/media/logo_header.png";
import './header.scss';

export function Header() {
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();
    const [subMenuVisible, setSubMenuVisible] = useState(false);
    const profilePictureRef = useRef<HTMLDivElement>(null);
    const subMenuRef = useRef<HTMLDivElement>(null);

    const userLetter = userInfo?.username ? userInfo.username.charAt(0).toUpperCase() : 'U';

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
            {/* LÓGICA: Removida a classe 'container' para permitir que o header ocupe 100% da largura */}
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
                    >
                        {userLetter}
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