// Ficheiro: app/routes/inventario.tsx
import { Marketplace } from "../views/marketplace/marketplace"; // Confirma só se o caminho para a tua view está certo
import { ProtectedRoute } from "../components/protected-route.component";

const title = "Marketplace | EntConnect";

export default function MarketplaceRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            
            {/* O nosso segurança VIP à porta da página! */}
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Direcao', 'Professor', 'Enc_Educacao']}>
                <Marketplace />
            </ProtectedRoute>
        </>
    );
} 