import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { eventosService } from '~/services/eventos.service';
import type { Evento } from '~/types/eventos.types';
import styles from './resumo-eventos-dashboard.module.css';

/**
 * Resolves the badge label shown for a public event type.
 *
 * @param tipo Event type key.
 * @returns Localized event type label.
 */
function obterEtiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
        evento: 'Evento',
        workshop: 'Workshop',
        concerto: 'Concerto',
        audicao: 'Audição',
        aviso: 'Aviso',
        outro: 'Outro',
    };

    return etiquetas[tipo] ?? 'Evento';
}

/**
 * Formats the event day for compact date badges.
 *
 * @param data Event date.
 * @returns Two-digit day label.
 */
function formatarDia(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
    }).format(new Date(data));
}

/**
 * Formats the event month for compact date badges.
 *
 * @param data Event date.
 * @returns Uppercase short month label.
 */
function formatarMes(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        month: 'short',
    })
        .format(new Date(data))
        .replace('.', '')
        .toUpperCase();
}

/**
 * Formats the full event date shown in the featured card.
 *
 * @param data Event date.
 * @returns Long-form localized date.
 */
function formatarDataCompleta(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(data));
}

/**
 * Formats the event time shown in event cards.
 *
 * @param data Event date.
 * @returns Localized time label.
 */
function formatarHora(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

/**
 * Resolves the current status of an event based on its dates.
 *
 * @param evento Event to evaluate.
 * @returns Current event status label.
 */
function obterEstadoEvento(evento: Evento): string {
    const agora = new Date();
    const inicio = new Date(evento.dataInicio);
    const fim = evento.dataFim ? new Date(evento.dataFim) : null;

    if (inicio <= agora && (!fim || fim >= agora)) {
        return 'A decorrer';
    }

    if (inicio > agora) {
        return 'Em breve';
    }

    return 'Terminado';
}

/**
 * Shows a dashboard summary with upcoming public events.
 */
export function ResumoEventosDashboard() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        let componenteAtivo = true;

        async function carregarEventos() {
            try {
                setLoading(true);
                setErro('');

                const dados = await eventosService.listarEventosPublicos({
                    apenasFuturos: true,
                    limite: 4,
                });

                if (!componenteAtivo) {
                    return;
                }

                setEventos(dados);
            } catch {
                if (!componenteAtivo) {
                    return;
                }

                setErro('Não foi possível carregar os eventos.');
            } finally {
                if (componenteAtivo) {
                    setLoading(false);
                }
            }
        }

        carregarEventos();

        return () => {
            componenteAtivo = false;
        };
    }, []);

    const eventoPrincipal = useMemo(() => {
        return eventos.find((evento) => evento.destaque) ?? eventos[0] ?? null;
    }, [eventos]);

    const eventosSecundarios = useMemo(() => {
        if (!eventoPrincipal) {
            return [];
        }

        return eventos.filter((evento) => evento.id !== eventoPrincipal.id);
    }, [eventos, eventoPrincipal]);

    return (
        <section className={styles.section}>
            <div className={styles.titleBlock}>
                <h2>Próximos Eventos</h2>
                <p>Eventos públicos publicados pela coordenação.</p>
            </div>

            {loading && (
                <div className={styles.skeletonGrid}>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <article key={index} className={styles.skeletonCard}>
                            <div className={styles.skeletonImage} />
                            <div className={styles.skeletonLineShort} />
                            <div className={styles.skeletonLine} />
                            <div className={styles.skeletonLineSmall} />
                        </article>
                    ))}
                </div>
            )}

            {!loading && erro && (
                <div className={styles.emptyState}>
                    <span>🎭</span>
                    <h3>Eventos indisponíveis</h3>
                    <p>{erro}</p>
                </div>
            )}

            {!loading && !erro && eventos.length === 0 && (
                <div className={styles.emptyState}>
                    <span>🎭</span>
                    <h3>Ainda não há eventos publicados</h3>
                    <p>
                        Quando a coordenação publicar eventos, eles vão aparecer aqui.
                    </p>
                </div>
            )}

            {!loading && !erro && eventoPrincipal && (
                <div className={styles.contentGrid}>
                    <Link
                        to={`/eventos/${eventoPrincipal.slug}`}
                        className={styles.featuredCard}
                    >
                        <div className={styles.featuredImage}>
                            {eventoPrincipal.imagem ? (
                                <img
                                    src={eventoPrincipal.imagem}
                                    alt={eventoPrincipal.titulo}
                                />
                            ) : (
                                <div className={styles.fallbackImage}>
                                    <span>🎭</span>
                                    <strong>Ent’Artes</strong>
                                </div>
                            )}
                        </div>

                        <div className={styles.featuredBody}>
                            <div className={styles.metaRow}>
                                <span className={styles.badge}>
                                    {obterEtiquetaTipo(eventoPrincipal.tipo)}
                                </span>
                                <span className={styles.statusBadge}>
                                    {obterEstadoEvento(eventoPrincipal)}
                                </span>
                            </div>

                            <h3>{eventoPrincipal.titulo}</h3>

                            {eventoPrincipal.resumo && (
                                <p>{eventoPrincipal.resumo}</p>
                            )}

                            <div className={styles.infoRow}>
                                <span>
                                    <i className="fa-regular fa-calendar"></i>
                                    {formatarDataCompleta(eventoPrincipal.dataInicio)}
                                </span>

                                <span>
                                    <i className="fa-regular fa-clock"></i>
                                    {formatarHora(eventoPrincipal.dataInicio)}
                                </span>

                                {eventoPrincipal.local && (
                                    <span>
                                        <i className="fa-solid fa-location-dot"></i>
                                        {eventoPrincipal.local}
                                    </span>
                                )}
                            </div>

                            <strong className={styles.cardLink}>
                                Ver detalhes →
                            </strong>
                        </div>
                    </Link>

                    <div className={styles.sideList}>
                        {eventosSecundarios.length > 0 ? (
                            eventosSecundarios.map((evento) => (
                                <Link
                                    key={evento.id}
                                    to={`/eventos/${evento.slug}`}
                                    className={styles.compactCard}
                                >
                                    <div className={styles.dateBox}>
                                        <strong>{formatarDia(evento.dataInicio)}</strong>
                                        <span>{formatarMes(evento.dataInicio)}</span>
                                    </div>

                                    <div className={styles.compactBody}>
                                        <div className={styles.metaRow}>
                                            <span className={styles.badgeSmall}>
                                                {obterEtiquetaTipo(evento.tipo)}
                                            </span>
                                        </div>

                                        <h4>{evento.titulo}</h4>

                                        <div className={styles.compactInfo}>
                                            <span>
                                                <i className="fa-regular fa-clock"></i>
                                                {formatarHora(evento.dataInicio)}
                                            </span>

                                            {evento.local && (
                                                <span>
                                                    <i className="fa-solid fa-location-dot"></i>
                                                    {evento.local}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className={styles.sideEmpty}>
                                <span>✨</span>
                                <p>Este é o único evento publicado de momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
