import Marcacoes from "../views/coaching/EE/verMarcacoes";

const title = "Minhas Marcações | EntConnect";

export default function MarcacoesRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Marcacoes />
        </>
    );
}