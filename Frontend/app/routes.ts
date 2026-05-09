import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [

    index("routes/home.tsx"),


    route("login", "routes/login.tsx"),


    route("eventos", "routes/eventos-publicos.tsx"),


    route("eventos/:slug", "routes/evento-detalhe-publico.tsx"),


    route("admin/eventos", "routes/gestao-eventos-coordenacao.tsx"),


    route("admin/salas", "routes/salas.tsx"),


    route("admin/modalidades", "routes/modalidade.tsx"),

    route("admin/coaching", "routes/gerirCoaching.tsx"),

    route("admin/pagamentos-coaching", "routes/pagamentosCoaching.tsx"),

    route("admin/utilizadores", "routes/configuracoes/utilizadores.tsx"),


    route("/admin/professores-disponibilidade", "routes/aprovacoes.tsx"),


    route("admin/professores", "routes/professor.tsx"),


    route("relatorios/faturacao", "routes/faturacao.tsx"),


    route("relatorios/relatorioCoaching", "routes/relatorioCoaching.tsx"),


    route("marketplace/inventario", "routes/inventario.tsx"),


    route("marketplace/anuncios", "routes/marketplace.tsx"),


    route("marketplace/atividades", "routes/atividades.tsx"),


    route("test-components", "routes/test-components.tsx"),


    route("relatorios/historico-coaching", "routes/historico.tsx"),


    route("relatorios/estatisticas", "routes/estatisticas.tsx"),


    route("/coaching/oferta", "routes/ofertaCoaching.tsx"),


    route("coaching/marcacoes", "routes/marcacoes.tsx"),

    route("educandos", "routes/educandos.tsx"),


    route("conta", "routes/conta.tsx"),


    route("agenda/agendamentos", "routes/agendamentos.tsx"),


    route("agenda/confirmacoes", "routes/confirmacoes.tsx"),


    route("coaching/confirmacoes", "routes/EEconfirmacoes.tsx"),


    route("agenda/disponibilidades", "routes/profDisponibilidades.tsx"),


    route("admin/calendario", "routes/adminCalendario.tsx"),


    route("admin/horarios", "routes/adminHorarios.tsx"),

] satisfies RouteConfig;
