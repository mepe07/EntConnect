import CoachingAdmin from "../views/coaching/coord/coachingAdmin";

const title = "Gerir Marcações | EntConnect";

export default function GerirMarcacoesRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <CoachingAdmin />
        </>
    );
}