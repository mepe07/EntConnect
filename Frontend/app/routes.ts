import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("login", "routes/login.tsx"),
    route("test-components", "routes/test-components.tsx"),
    route("marketplace", "routes/marketplace.tsx"),
    route("faturacao", "routes/faturacao.tsx"),
    route("configuracoes/utilizadores", "routes/configuracoes/utilizadores.tsx")] satisfies RouteConfig;
