import { ButtonComponent } from '~/components/button/button.component';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Navigate,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import "./assets/styles/styles.scss";
import { Header } from "./structure/header/header";
import { NavigationMenu } from "./structure/navigation-menu/navigation-menu";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Login } from "./views/login/login";
import { useEffect, useState } from "react";
import { authService } from "./services/auth.service";
import { ThemeToggle } from "./components/theme-toggle/theme-toggle";
import { ToastProvider } from "./components/toast/toast";
import { useTheme } from "./utils/theme";
import type { User } from "./models/interfaces/user.interface";

const ADMIN_ROLES_PERMITIDAS = ['Coordenador'];

function temRoleAdmin(userInfo: User | null) {
    return Boolean(userInfo && ADMIN_ROLES_PERMITIDAS.includes(userInfo.role));
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css",
  }
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <body className="h-full bg-white m-0 p-0">
        {children}
        <ToastProvider />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
    </>
  );
}

export default function App() {
    useTheme();
    const [domLoaded, setDomLoaded] = useState(false);
    const [sessaoValida, setSessaoValida] = useState(false);
    const [versaoSessao, setVersaoSessao] = useState(0);
    const [menuMobileAberto, setMenuMobileAberto] = useState(false);
    const [menuDesktopColapsado, setMenuDesktopColapsado] = useState(false);
    const location = useLocation();
    const isRotaPublicaEventos =
        location.pathname === '/eventos' ||
        location.pathname.startsWith('/eventos/');
    const isRotaAdmin = location.pathname.startsWith('/admin');

    useEffect(() => {
        setDomLoaded(true);
        authService.configurarValidacaoGlobal();

        const menuGuardado = localStorage.getItem('entconnect-menu-desktop-colapsado');
        setMenuDesktopColapsado(menuGuardado === 'true');
    }, []);

    useEffect(() => {


        setSessaoValida(authService.isAuthenticated());
        setMenuMobileAberto(false);
    }, [location.pathname, versaoSessao]);

    useEffect(() => {
        function handleRoleAlterada() {
            setVersaoSessao((versaoAtual) => versaoAtual + 1);
        }

        window.addEventListener('entconnect-role-alterada', handleRoleAlterada);
        window.addEventListener('entconnect-sessao-invalida', handleRoleAlterada);

        return () => {
            window.removeEventListener('entconnect-role-alterada', handleRoleAlterada);
            window.removeEventListener('entconnect-sessao-invalida', handleRoleAlterada);
        };
    }, []);

    useEffect(() => {

        const intervalId = window.setInterval(() => {
            setSessaoValida(authService.isAuthenticated());
        }, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

    const page = (
        <div className={`app-layout min-h-screen bg-[#f8fafc] ${menuDesktopColapsado ? 'sidebar-collapsed' : ''}`}>
            <Header
                key={`header-${versaoSessao}`}
                menuMobileAberto={menuMobileAberto}
                onToggleMenuMobile={() => setMenuMobileAberto((aberto) => !aberto)}
            />
            <div className="main-wrapper">
                <NavigationMenu
                    key={`menu-${versaoSessao}`}
                    menuMobileAberto={menuMobileAberto}
                    onCloseMenuMobile={() => setMenuMobileAberto(false)}
                    menuDesktopColapsado={menuDesktopColapsado}
                    onToggleMenuDesktop={() => {
                        setMenuDesktopColapsado((colapsado) => {
                            const novoEstado = !colapsado;
                            localStorage.setItem('entconnect-menu-desktop-colapsado', String(novoEstado));
                            return novoEstado;
                        });
                    }}
                />
                {menuMobileAberto && (
                    <ButtonComponent
                        type="button"
                        className="mobile-menu-overlay"
                        aria-label="Fechar menu"
                        onClick={() => setMenuMobileAberto(false)}
                    />
                )}
                <div className="body-wrapper">
                    <Outlet />
                </div>
            </div>
        </div>
    );

    if (!domLoaded) {
        return null;
    }

    if (location.pathname === '/login') {
        if (sessaoValida) {
            return <Navigate to="/" replace />;
        }

        return <Login />;
    }


    if (isRotaPublicaEventos) {
        return (
            <>
                <ThemeToggle className="public-theme-toggle" />
                <Outlet />
            </>
        );
    }

    if (!sessaoValida) {
        return <Navigate to="/login" replace />;
    }

    if (isRotaAdmin && !temRoleAdmin(authService.getUserInfo())) {
        return <Navigate to="/" replace />;
    }

    return page;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
