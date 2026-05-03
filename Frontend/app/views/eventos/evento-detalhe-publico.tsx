

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { eventosService } from '~/services/eventos.service';
import type { Evento } from '~/types/eventos.types';
import styles from './evento-detalhe-publico.module.css';

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

function formatarDataCompleta(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(data));
}

function formatarHora(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

function formatarIntervaloEvento(evento: Evento): string {
    const dataInicio = formatarDataCompleta(evento.dataInicio);
    const horaInicio = formatarHora(evento.dataInicio);

    if (!evento.dataFim) {
        return `${dataInicio} · ${horaInicio}`;
    }

    const horaFim = formatarHora(evento.dataFim);

    return `${dataInicio} · ${horaInicio} - ${horaFim}`;
}

export function EventoDetalhePublico() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [evento, setEvento] = useState<Evento | null>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        let componenteAtivo = true;

        async function carregarEvento() {
            if (!slug) {
                setErro('Evento inválido.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setErro('');

                const dadosEvento = await eventosService.obterEventoPublicoPorSlug(slug);

                if (!componenteAtivo) {
                    return;
                }

                setEvento(dadosEvento);
                document.title = `${dadosEvento.titulo} | EntConnect`;
            } catch (error) {
                if (!componenteAtivo) {
                    return;
                }

                setErro(
                    error instanceof Error
                        ? error.message
                        : 'Não foi possível carregar este evento.'
                );
            } finally {
                if (componenteAtivo) {
                    setLoading(false);
                }
            }
        }

        carregarEvento();

        return () => {
            componenteAtivo = false;
        };
    }, [slug]);

    const textoData = useMemo(() => {
        if (!evento) {
            return '';
        }

        return formatarIntervaloEvento(evento);
    }, [evento]);

    if (loading) {
        return (
            <main className={styles.page}>
                <section className={styles.loadingCard}>
                    <div className={styles.loadingBadge} />
                    <div className={styles.loadingTitle} />
                    <div className={styles.loadingText} />
                    <div className={styles.loadingTextShort} />
                </section>
            </main>
        );
    }

    if (erro || !evento) {
        return (
            <main className={styles.page}>
                <section className={styles.errorCard}>
                    <span className={styles.errorIcon}>🎭</span>
                    <h1>Evento não encontrado</h1>
                    <p>
                        O evento pode ter sido removido, ainda não estar publicado
                        ou o link pode estar incorreto.
                    </p>

                    <div className={styles.errorActions}>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => navigate('/login')}
                        >
                            Voltar ao login
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <Link to="/login" className={styles.logoFlutuante}>
                EntConnect
            </Link>

            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.eventMeta}>
                        <span className={styles.badge}>
                            {obterEtiquetaTipo(evento.tipo)}
                        </span>

                        {evento.destaque && (
                            <span className={styles.highlightBadge}>
                                Destaque
                            </span>
                        )}
                    </div>

                    <h1>{evento.titulo}</h1>

                    {evento.resumo && (
                        <p className={styles.resumo}>{evento.resumo}</p>
                    )}

                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Data</span>
                            <strong>{textoData}</strong>
                        </div>

                        {evento.local && (
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Local</span>
                                <strong>{evento.local}</strong>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    {evento.imagem ? (
                        <img
                            src={evento.imagem}
                            alt={evento.titulo}
                            className={styles.eventImage}
                        />
                    ) : (
                        <div className={styles.fallbackImage}>
                            <span>🎭</span>
                            <strong>Ent’Artes</strong>
                        </div>
                    )}
                </div>
            </section>

            <section className={styles.contentSection}>
                <article className={styles.descriptionCard}>
                    <span className={styles.sectionEyebrow}>Sobre o evento</span>
                    <h2>Detalhes</h2>

                    {evento.descricao ? (
                        <p>{evento.descricao}</p>
                    ) : (
                        <p>
                            Ainda não existe uma descrição detalhada para este evento.
                        </p>
                    )}
                </article>

                <aside className={styles.sideCard}>
                    <span className={styles.sectionEyebrow}>Resumo rápido</span>

                    <div className={styles.sideInfo}>
                        <span>Tipo</span>
                        <strong>{obterEtiquetaTipo(evento.tipo)}</strong>
                    </div>

                    <div className={styles.sideInfo}>
                        <span>Data</span>
                        <strong>{textoData}</strong>
                    </div>

                    {evento.local && (
                        <div className={styles.sideInfo}>
                            <span>Local</span>
                            <strong>{evento.local}</strong>
                        </div>
                    )}

                    <Link to="/eventos" className={styles.secondaryButton}>
                        Ver todos os eventos
                    </Link>

                    <Link to="/login" className={styles.primaryButton}>
                        Entrar na plataforma
                    </Link>
                </aside>
            </section>
        </main>
    );
}