import type { Route } from "./+types/home";

// O símbolo "~/" é um atalho (alias) muito elegante configurado no Vite 
// que aponta sempre para a raiz da pasta "app", evitando andares com "../../../" perdidos.
import { Login } from "~/pages/Login/Login";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "EntConnect | Iniciar Sessão" },
        { name: "description", content: "Faça login para aceder à plataforma EntConnect." },
    ];
}

// 3. A função principal da rota. Quando o utilizador acede a "/", isto é o que é desenhado.
export default function Home() {
    return <Login />;
}