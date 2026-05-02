import Horarios from "../views/coaching/coord/horariosAdmin";

const title = "Horários | EntConnect";

export default function HorariosRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Horarios />
        </>
    );
}