import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    // A porta principal
    index("routes/home.tsx"), 
    
    // Rota de Login
    route("login", "routes/login.tsx"),

    // ==========================================
    // AS CORREÇÕES DOS CAMINHOS (URLs)
    // O 1º argumento agora é igualzinho à NavBar!
    // ==========================================

    // NavBar diz: path: '/admin/salas'
    route("admin/salas", "routes/salas.tsx"),

    // NavBar diz: path: '/admin/modalidades'
    route("admin/modalidades", "routes/modalidade.tsx"),

    // NavBar diz: path: '/admin/utilizadores'
    route("admin/utilizadores", "routes/configuracoes/utilizadores.tsx"),

        // Rota dos professores
    route("admin/professores", "routes/professor.tsx"),

    // NavBar diz: path: '/relatorios/faturacao'
    route("relatorios/faturacao", "routes/faturacao.tsx"),

    // Rota solta do marketplace
    route("marketplace", "routes/marketplace.tsx"),

    // Rota de testes
    route("test-components", "routes/test-components.tsx"),

    // Rota do histórico de coaching
    route("relatorios/historico-coaching", "routes/historico.tsx"),

    // Rota das estatísticas
    route("relatorios/estatisticas", "routes/estatisticas.tsx")




] satisfies RouteConfig;
