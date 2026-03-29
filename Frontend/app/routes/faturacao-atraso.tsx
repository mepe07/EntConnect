import { FaturacaoAtraso } from "~/views/coaching/faturacao-atraso/faturacao-atraso";

const title = "Faturação em Atraso | EntConnect";

export default function FaturacaoAtrasoRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            {/* Aqui invocamos o ecrã maravilhoso que acabaste de construir */}
            <FaturacaoAtraso />
        </>
    );
} 