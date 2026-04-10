import AprovarDisponibilidade from "../views/coaching/professores/aprovarDisponibilidade";

const title = "Aprovações de Professores | EntConnect";

export default function AprovacoesRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <AprovarDisponibilidade />
        </>
    );
}