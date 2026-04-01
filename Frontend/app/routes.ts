import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("marketplace", "routes/marketplace.tsx"),
    route("test-components", "routes/test-components.tsx"),
    route("login", "routes/login.tsx"),
    route("faturacao", "routes/faturacao.tsx"),



    // LÓGICA:
    // O primeiro argumento ("admin/salas") é o que aparece na barra do browser.
    // O segundo argumento ("routes/tabelas/salas.tsx") é onde o ficheiro físico mora no teu projeto.
    route("admin/salas", "routes/salas.tsx"),
    //route("modalidades", "routes/tabelas/modalidades.tsx")


] satisfies RouteConfig;
