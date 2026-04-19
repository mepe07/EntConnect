// Ficheiro: Frontend/app/routes/inventario.tsx
import { Inventario } from '../views/inventario/inventario';
import { ProtectedRoute } from '../components/protected-route.component';

const title = 'Inventário | EntConnect';

export default function InventarioRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Admin']}>
                <Inventario />
            </ProtectedRoute>
        </>
    );
}
