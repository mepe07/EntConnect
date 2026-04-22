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
import { Header } from "./structure/header/header";
import { NavigationMenu } from "./structure/navigation-menu/navigation-menu";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Login } from "./views/login/login";
import { useEffect, useState } from "react";

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
  },
  {
    rel: "stylesheet",
    href: "/app/assets/styles/styles.scss",
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
      {/* Adicionado o h-full para garantir que o html/body ocupam o ecrã todo sem scroll indesejado */}
      <body className="h-full bg-white m-0 p-0">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
    </>
  );
} 

export default function App() {
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);
  
  // ==========================================
  // LAYOUT DA APLICAÇÃO (Quando Logado)
  // ==========================================
  const page = (
      <div className="app-layout min-h-screen bg-[#f8fafc]"> {/* Fundo global cinza claro para evitar barras pretas */}
          <Header />
          <div className="main-wrapper">
              <NavigationMenu />
              {/* Adicionado min-h-screen para esticar até ao fundo e cobrir a tela toda */}
              {/*<div className="body-wrapper ml-[280px] pt-[76px] w-full min-h-screen p-6">*/}
              {/* Usamos mt-[76px] para empurrar abaixo do header, e p-8 para dar um espaço bonito por dentro */}
              <div className="body-wrapper ml-[280px] mt-[76px] w-full min-h-[calc(100vh-76px)] p-6">
                <Outlet />
              </div>
          </div>
      </div>
  );

  // ==========================================
  // PROTEÇÃO DE ROTAS (Login vs App)
  // ==========================================
  // If we're on the client, check for the token and conditionally render the page or redirect to login.
  if(domLoaded) {
    const currentUserToken = localStorage.getItem('entconnect_token');
      if (currentUserToken) {
        return page; // Mostra a App normal (com Header e Sidebar)
      } else {
        return <Login />; // O Login toma conta do ecrã TODO (ignora o layout acima)
      }
    }
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