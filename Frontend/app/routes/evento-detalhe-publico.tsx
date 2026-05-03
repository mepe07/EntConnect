

import { EventoDetalhePublico } from '../views/eventos/evento-detalhe-publico';

const title = 'Evento | EntConnect';

export default function EventoDetalhePublicoRoute() {
    return (
        <>
            <title>{title}</title>
            <meta property="og:title" content={title} />
            <EventoDetalhePublico />
        </>
    );
}