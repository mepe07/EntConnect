import { Utilizadores } from "~/views/utilizadores/utilizadores";

const title = "Utilizadores | EntConnect";

export default function UtilizadoresRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <Utilizadores />
        </>
    );
} 