

import { CatalogoEventosPublicos } from '~/views/eventos/catalogo-eventos-publicos';

const title = 'Eventos | EntConnect';

export default function EventosPublicosRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <CatalogoEventosPublicos />
        </>
    );
}