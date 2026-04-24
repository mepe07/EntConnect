import { Atividades } from "../views/atividades/atividades";
import { ProtectedRoute } from "../components/protected-route.component";

const title = "Registo de Moderação | EntConnect";

export default function AtividadesRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />

            <ProtectedRoute rolesPermitidas={['Coordenador']}>
                <Atividades />
            </ProtectedRoute>
        </>
    );
} 