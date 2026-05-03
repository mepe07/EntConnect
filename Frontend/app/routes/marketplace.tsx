
import { Marketplace } from '../views/marketplace/marketplace';
import { ProtectedRoute } from '../components/protected-route.component';

const title = 'Marketplace | EntConnect';


export default function MarketplaceRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />


            <ProtectedRoute rolesPermitidas={['Coordenador', 'Professor', 'Enc_Educacao']}>
                <Marketplace />
            </ProtectedRoute>
        </>
    );
}