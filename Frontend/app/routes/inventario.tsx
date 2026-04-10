// Ficheiro: app/routes/inventario.tsx
import { Inventario } from "../views/inventario/inventario"; // Confirma só se o caminho para a tua view está certo
import { ProtectedRoute } from "../components/protected-route.component";

const title = "Inventário | EntConnect";

export default function InventarioRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            
            {/* O nosso segurança VIP à porta da página! */}
            <ProtectedRoute rolesPermitidas={['Coordenador', 'Direcao']}>
                <Inventario />
            </ProtectedRoute>
        </>
    );
} 