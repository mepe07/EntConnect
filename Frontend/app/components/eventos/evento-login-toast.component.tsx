import { ButtonComponent } from '~/components/button/button.component';


import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { eventosService } from '~/services/eventos.service';
import type { EventoResumo } from '~/types/eventos.types';
import styles from './evento-login-toast.module.css';

const TEMPO_ENTRADA_MS = 900;
const TEMPO_VISIVEL_MS = 7500;
const STORAGE_KEY = 'entconnect_eventos_login_vistos';


const TEMPO_BLOQUEIO_TOAST_MS = 24 * 60 * 60 * 1000;

type EventoVistoStorage = {
    id: number;
    vistoEm: string;
};


function obterEventosVistos(): EventoVistoStorage[] {
    try {
        const valor = localStorage.getItem(STORAGE_KEY);

        if (!valor) {
            return [];
        }

        const eventos = JSON.parse(valor);

        if (!Array.isArray(eventos)) {
            return [];
        }

        return eventos.filter((evento) => {
            return (
                typeof evento.id === 'number' &&
                typeof evento.vistoEm === 'string'
            );
        });
    } catch {
        return [];
    }
}


function limparEventosVistosExpirados(): EventoVistoStorage[] {
    const agora = Date.now();

    const eventosValidos = obterEventosVistos().filter((evento) => {
        const vistoEm = new Date(evento.vistoEm).getTime();

        if (Number.isNaN(vistoEm)) {
            return false;
        }

        return agora - vistoEm < TEMPO_BLOQUEIO_TOAST_MS;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventosValidos));

    return eventosValidos;
}


function eventoFoiVistoRecentemente(idEvento: number): boolean {
    const eventosVistos = limparEventosVistosExpirados();

    return eventosVistos.some((evento) => evento.id === idEvento);
}


function guardarEventoVisto(idEvento: number): void {
    const eventosVistos = limparEventosVistosExpirados();

    const eventosSemDuplicado = eventosVistos.filter(
        (evento) => evento.id !== idEvento
    );

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
            ...eventosSemDuplicado,
            {
                id: idEvento,
                vistoEm: new Date().toISOString(),
            },
        ])
    );
}

function formatarDataEvento(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

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

export function EventoLoginToast() {
    const navigate = useNavigate();

    const [evento, setEvento] = useState<EventoResumo | null>(null);
    const [visivel, setVisivel] = useState(false);
    const [fechadoManual, setFechadoManual] = useState(false);
    const [pausado, setPausado] = useState(false);

    const textoData = useMemo(() => {
        if (!evento) {
            return '';
        }

        const dataFormatada = formatarDataEvento(evento.dataInicio);

        if (evento.local) {
            return `${dataFormatada} · ${evento.local}`;
        }

        return dataFormatada;
    }, [evento]);

    useEffect(() => {
        let timeoutEntrada: number;

        async function carregarEventoToast() {
            try {
                const eventos = await eventosService.listarEventosLoginToast();


                const proximoEvento = eventos.find(
                    (item) => !eventoFoiVistoRecentemente(item.id)
                );

                if (!proximoEvento) {
                    return;
                }

                setEvento(proximoEvento);

                timeoutEntrada = window.setTimeout(() => {
                    setVisivel(true);
                }, TEMPO_ENTRADA_MS);
            } catch {


            }
        }

        carregarEventoToast();

        return () => {
            window.clearTimeout(timeoutEntrada);
        };
    }, []);

    useEffect(() => {
        if (!evento || !visivel || fechadoManual || pausado) {
            return;
        }

        const timeoutSaida = window.setTimeout(() => {
            fecharToast();
        }, TEMPO_VISIVEL_MS);

        return () => {
            window.clearTimeout(timeoutSaida);
        };
    }, [evento, visivel, fechadoManual, pausado]);

    function fecharToast() {
        if (evento) {
            guardarEventoVisto(evento.id);
        }

        setVisivel(false);
        setFechadoManual(true);
    }

    function abrirEvento() {
        if (!evento) {
            return;
        }

        guardarEventoVisto(evento.id);
        navigate(`/eventos/${evento.slug}`);
    }

    if (!evento) {
        return null;
    }

    return (
        <div
            className={`${styles.toast} ${visivel ? styles.toastVisivel : ''}`}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            role="button"
            tabIndex={0}
            onClick={abrirEvento}
            onKeyDown={(eventoTeclado) => {
                if (eventoTeclado.key === 'Enter') {
                    abrirEvento();
                }
            }}
        >
            <ButtonComponent
                type="button"
                className={styles.botaoFechar}
                onClick={(eventoClick) => {
                    eventoClick.stopPropagation();
                    fecharToast();
                }}
                aria-label="Fechar notificação de evento"
            >
                ×
            </ButtonComponent>

            <div className={styles.icone}>
                🎭
            </div>

            <div className={styles.conteudo}>
                <div className={styles.topo}>
                    <span className={styles.badge}>
                        {obterEtiquetaTipo(evento.tipo)}
                    </span>
                    <span className={styles.data}>{textoData}</span>
                </div>

                <h3>{evento.titulo}</h3>

                {evento.resumo && (
                    <p>{evento.resumo}</p>
                )}

                <span className={styles.linkFake}>
                    Ver evento →
                </span>
            </div>

            <div
                className={`${styles.barraProgresso} ${pausado ? styles.barraPausada : ''
                    }`}
            />
        </div>
    );
}