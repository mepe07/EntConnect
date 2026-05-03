import Calendario from "../views/coaching/coord/calendarioAdmin";

const title = "Calendário | EntConnect";

export default function CalendarioRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Calendario />
        </>
    );
}