

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { eventosService } from '~/services/eventos.service';
import type { Evento, TipoEvento } from '~/types/eventos.types';
import styles from './catalogo-eventos-publicos.module.css';

type FiltroTipoEvento = TipoEvento | 'todos';

type OpcaoFiltroTipo = {
    valor: FiltroTipoEvento;
    label: string;
};

const FILTROS_TIPO: OpcaoFiltroTipo[] = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'workshop', label: 'Workshops' },
    { valor: 'concerto', label: 'Concertos' },
    { valor: 'audicao', label: 'Audições' },
    { valor: 'aviso', label: 'Avisos' },
    { valor: 'evento', label: 'Eventos' },
];

function obterEtiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
        evento: 'Evento',
        workshop: 'Workshop',
        concerto: 'Concerto',
        audicao: 'Audição',
        aviso: 'Aviso',
        outro: 'Novidade',
    };

    return etiquetas[tipo] ?? 'Evento';
}

function formatarDataCurta(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

function obterEstadoEvento(evento: Evento): string {
    const agora = new Date();
    const dataInicio = new Date(evento.dataInicio);
    const dataFim = evento.dataFim ? new Date(evento.dataFim) : null;

    if (dataInicio <= agora && (!dataFim || dataFim >= agora)) {
        return 'A decorrer';
    }

    if (dataInicio > agora) {
        return 'Em breve';
    }

    return 'Terminado';
}

export function CatalogoEventosPublicos() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [pesquisa, setPesquisa] = useState('');
    const [tipoSelecionado, setTipoSelecionado] = useState<FiltroTipoEvento>('todos');

    useEffect(() => {
        let componenteAtivo = true;

        async function carregarEventos() {
            try {
                setLoading(true);
                setErro('');

                const dados = await eventosService.listarEventosPublicos({
                    pesquisa,
                    tipo: tipoSelecionado,
                    apenasFuturos: true,
                    limite: 50,
                });

                if (!componenteAtivo) {
                    return;
                }

                setEventos(dados);
            } catch (error) {
                if (!componenteAtivo) {
                    return;
                }

                setErro(
                    error instanceof Error
                        ? error.message
                        : 'Não foi possível carregar os eventos.'
                );
            } finally {
                if (componenteAtivo) {
                    setLoading(false);
                }
            }
        }

        const timeoutPesquisa = window.setTimeout(() => {
            carregarEventos();
        }, 250);

        return () => {
            componenteAtivo = false;
            window.clearTimeout(timeoutPesquisa);
        };
    }, [pesquisa, tipoSelecionado]);

    const eventoDestaque = useMemo(() => {
        return eventos.find((evento) => evento.destaque) ?? eventos[0] ?? null;
    }, [eventos]);

    const eventosSecundarios = useMemo(() => {
        if (!eventoDestaque) {
            return eventos;
        }

        return eventos.filter((evento) => evento.id !== eventoDestaque.id);
    }, [eventos, eventoDestaque]);

    return (
        <main className={styles.page}>
            <Link to="/login" className={styles.logoFlutuante}>
                EntConnect
            </Link>

            <section className={styles.hero}>
                <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}>Eventos Ent’Artes</span>
                    <h1>Descobre o que está a acontecer na escola.</h1>
                    <p>
                        Workshops, audições, concertos e atividades abertas à comunidade.
                    </p>
                </div>

                <div className={styles.heroActions}>
                    <Link to="/login" className={styles.loginLink}>
                        Entrar na plataforma
                    </Link>
                </div>
            </section>

            <section className={styles.filtersCard}>
                <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>⌕</span>
                    <input
                        type="search"
                        value={pesquisa}
                        onChange={(evento) => setPesquisa(evento.target.value)}
                        placeholder="Pesquisar por título, local ou descrição..."
                        aria-label="Pesquisar eventos"
                    />
                </div>

                <div className={styles.filterButtons}>
                    {FILTROS_TIPO.map((filtro) => (
                        <button
                            key={filtro.valor}
                            type="button"
                            className={
                                tipoSelecionado === filtro.valor
                                    ? `${styles.filterButton} ${styles.filterButtonActive}`
                                    : styles.filterButton
                            }
                            onClick={() => setTipoSelecionado(filtro.valor)}
                        >
                            {filtro.label}
                        </button>
                    ))}
                </div>
            </section>

            {loading && (
                <section className={styles.grid}>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <article key={index} className={styles.skeletonCard}>
                            <div className={styles.skeletonImage} />
                            <div className={styles.skeletonLineShort} />
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLineSmall} />
                        </article>
                    ))}
                </section>
            )}

            {!loading && erro && (
                <section className={styles.emptyState}>
                    <span>🎭</span>
                    <h2>Não foi possível carregar os eventos</h2>
                    <p>{erro}</p>
                </section>
            )}

            {!loading && !erro && eventos.length === 0 && (
                <section className={styles.emptyState}>
                    <span>🎭</span>
                    <h2>Sem eventos publicados</h2>
                    <p>
                        Neste momento ainda não existem eventos disponíveis para estes filtros.
                    </p>
                </section>
            )}

            {!loading && !erro && eventos.length > 0 && (
                <>
                    {eventoDestaque && (
                        <section className={styles.featured}>
                            <div className={styles.featuredImageWrap}>
                                {eventoDestaque.imagem ? (
                                    <img
                                        src={eventoDestaque.imagem}
                                        alt={eventoDestaque.titulo}
                                        className={styles.featuredImage}
                                    />
                                ) : (
                                    <div className={styles.featuredFallback}>
                                        <span>🎭</span>
                                        <strong>Ent’Artes</strong>
                                    </div>
                                )}
                            </div>

                            <div className={styles.featuredContent}>
                                <div className={styles.eventMeta}>
                                    <span className={styles.badge}>
                                        {obterEtiquetaTipo(eventoDestaque.tipo)}
                                    </span>
                                    <span className={styles.statusBadge}>
                                        {obterEstadoEvento(eventoDestaque)}
                                    </span>
                                </div>

                                <h2>{eventoDestaque.titulo}</h2>

                                {eventoDestaque.resumo && (
                                    <p>{eventoDestaque.resumo}</p>
                                )}

                                <div className={styles.featuredInfo}>
                                    <span>{formatarDataCurta(eventoDestaque.dataInicio)}</span>

                                    {eventoDestaque.local && (
                                        <span>{eventoDestaque.local}</span>
                                    )}
                                </div>

                                <Link
                                    to={`/eventos/${eventoDestaque.slug}`}
                                    className={styles.primaryButton}
                                >
                                    Ver detalhes
                                </Link>
                            </div>
                        </section>
                    )}

                    {eventosSecundarios.length > 0 && (
                        <section className={styles.grid}>
                            {eventosSecundarios.map((evento) => (
                                <article key={evento.id} className={styles.eventCard}>
                                    <div className={styles.cardImageWrap}>
                                        {evento.imagem ? (
                                            <img
                                                src={evento.imagem}
                                                alt={evento.titulo}
                                                className={styles.cardImage}
                                            />
                                        ) : (
                                            <div className={styles.cardFallback}>
                                                🎭
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.cardBody}>
                                        <div className={styles.eventMeta}>
                                            <span className={styles.badge}>
                                                {obterEtiquetaTipo(evento.tipo)}
                                            </span>
                                            <span className={styles.statusBadge}>
                                                {obterEstadoEvento(evento)}
                                            </span>
                                        </div>

                                        <h3>{evento.titulo}</h3>

                                        {evento.resumo && (
                                            <p>{evento.resumo}</p>
                                        )}

                                        <div className={styles.cardInfo}>
                                            <span>{formatarDataCurta(evento.dataInicio)}</span>

                                            {evento.local && (
                                                <span>{evento.local}</span>
                                            )}
                                        </div>

                                        <Link
                                            to={`/eventos/${evento.slug}`}
                                            className={styles.cardLink}
                                        >
                                            Ver evento →
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </>
            )}
        </main>
    );
}