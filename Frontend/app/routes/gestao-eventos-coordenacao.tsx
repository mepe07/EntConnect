// Ficheiro: app/routes/gestao-eventos-coordenacao.tsx

import { ProtectedRoute } from '~/components/protected-route.component';
import { PainelEventosCoordenacao } from '~/views/eventos/painel-eventos-coordenacao';

const title = 'Gestão de Eventos | EntConnect';

export default function GestaoEventosCoordenacaoRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />

            <ProtectedRoute rolesPermitidas={['Coordenador']}>
                <PainelEventosCoordenacao />
            </ProtectedRoute>
        </>
    );
} 