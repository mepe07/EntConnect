import Coaching from "../views/coaching/EE/coaching";

const title = "Oferta de Coaching | EntConnect";

export default function CoachingRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Coaching />
        </>
    );
}