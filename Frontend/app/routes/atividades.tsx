// Ficheiro: src/routes/atividades.tsx

import { Atividades } from "../views/atividades/atividades"; // 👈 Aponta para o ficheiro e componente corretos
import { ProtectedRoute } from "../components/protected-route.component";

const title = "Atividades do Marketplace | EntConnect";

export default function AtividadesRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            
            {/* As atividades são para todos os que têm conta e interagem com o Marketplace */}
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Direcao', 'Professor', 'Enc_Educacao']}>
                <Atividades />
            </ProtectedRoute>
        </>
    );
} 