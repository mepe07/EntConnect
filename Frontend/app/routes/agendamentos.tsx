import VerAgendamentos from "../views/coaching/professores/verAgendamentos"

const title = "Os meus agendamentos | EntConnect";

export default function AgendamentosRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <VerAgendamentos />
        </>
    );
}