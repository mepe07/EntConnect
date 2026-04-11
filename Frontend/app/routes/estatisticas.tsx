// Ficheiro: app/routes/estatisticas.tsx
import { Estatisticas } from "../views/relatorios/estatisticas/estatisticas";

const title = "Estatísticas | EntConnect";

export default function EstatisticasRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Estatisticas />
        </>
    );
} 