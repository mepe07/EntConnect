// Ficheiro: Frontend/app/routes/marketplace.tsx
import { Marketplace } from '../views/marketplace/marketplace';
import { ProtectedRoute } from '../components/protected-route.component';

const title = 'Marketplace | EntConnect';

/**
 * Rota do Marketplace.
 * Define quem tem permissão para aceder à funcionalidade.
 */
export default function MarketplaceRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            
            {/* Proteção de rota baseada nas roles enviadas pelo JWT */}
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Admin', 'Direcao', 'Professor', 'Enc_Educacao']}>
                <Marketplace />
            </ProtectedRoute>
        </>
    );
} 