// Ficheiro: app/routes/estatisticas.tsx
import { Estatisticas } from "../views/relatorios/estatisticas/estatisticas";
import { ProtectedRoute } from "../components/protected-route.component";

const title = "Estatísticas | EntConnect";

export default function EstatisticasRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Professor']}>
            <Estatisticas />
            </ProtectedRoute>
        </>
    );
} 