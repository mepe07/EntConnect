import PagamentosCoachingAdmin from "../views/coaching/coord/pagamentosCoaching";

const title = "Gerir Pagamentos | EntConnect";

export default function PagamentosCoachingRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <PagamentosCoachingAdmin />
        </>
    );
}
