import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("marketplace", "routes/marketplace.tsx")] satisfies RouteConfig;
