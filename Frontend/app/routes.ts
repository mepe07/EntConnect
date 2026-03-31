import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("marketplace", "routes/marketplace.tsx"),
    route("test-components", "routes/test-components.tsx"),
    route("login", "routes/login.tsx"),
    route("faturacao", "routes/faturacao.tsx")] satisfies RouteConfig;
