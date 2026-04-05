import { HistoricoCoaching } from "../views/relatorios/historico/historico";

const title = "Historico | EntConnect";

export default function HistoricoRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <HistoricoCoaching />
        </>
    );
} 