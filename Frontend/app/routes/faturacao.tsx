import { Faturacao } from "~/views/relatorios/faturacao";

const title = "Centro de Faturação | EntConnect";

export default function FaturacaoAtrasoRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Faturacao />
        </>
    );
} 