import { Perfil } from "../views/perfil/perfil"; 
import { ProtectedRoute } from "../components/protected-route.component";

const title = "O Meu Perfil | EntConnect";

export default function PerfilRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            
            {/* O Perfil é para todos os que têm conta na escola! */}
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Direcao', 'Professor', 'Enc_Educacao']}>
                <Perfil />
            </ProtectedRoute>
        </>
    );
} 