import { ButtonComponent } from '~/components/button/button.component';
import { showToast } from '~/components/toast/toast';


import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
    eventosService,
    type ComunicacaoEvento,
    type CriarComunicacaoEventoPayload,
    type TipoComunicacaoEvento,
} from '~/services/eventos.service';
import { authService } from '~/services/auth.service';
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

type PerfilAutenticado = {
    id: number;
    role: string;
};

type EstadoFormularioComunicacao = {
    titulo: string;
    mensagem: string;
    tipo: TipoComunicacaoEvento;
    importante: boolean;
};

const FORM_COMUNICACAO_INICIAL: EstadoFormularioComunicacao = {
    titulo: '',
    mensagem: '',
    tipo: 'GERAL',
    importante: false,
};

const TIPOS_COMUNICACAO: { valor: TipoComunicacaoEvento; label: string }[] = [
    { valor: 'GERAL', label: 'Informação geral' },
    { valor: 'FIGURINO', label: 'Figurino' },
    { valor: 'LOCAL', label: 'Local' },
    { valor: 'HORARIO', label: 'Horário' },
    { valor: 'DOCUMENTOS', label: 'Documentos' },
    { valor: 'OUTRO', label: 'Outro' },
];

function formatarDataCurta(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

function obterEtiquetaTipoComunicacao(tipo: string): string {
    return (
        TIPOS_COMUNICACAO.find((opcao) => opcao.valor === tipo)?.label ??
        'Informação'
    );
}

function descodificarBase64Url(valor: string): string {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const base64ComPadding = base64.padEnd(
        Math.ceil(base64.length / 4) * 4,
        '=',
    );

    return atob(base64ComPadding);
}

/**
 * Obtém os dados mínimos do utilizador autenticado através do token.
 * Usado apenas para controlar a interface; a autorização real continua no backend.
 */
function obterPerfilAutenticado(): PerfilAutenticado | null {
    const token = authService.getToken();

    if (!token) {
        return null;
    }

    try {
        const [, payload] = token.split('.');

        if (!payload) {
            return null;
        }

        const dados = JSON.parse(descodificarBase64Url(payload)) as {
            sub?: number | string;
            id?: number | string;
            ID_Utilizador?: number | string;
            role?: string | string[];
            roles?: string | string[];
            Role?: string | string[];
        };

        const id = Number(dados.sub ?? dados.id ?? dados.ID_Utilizador);
        const roleBruta = dados.role ?? dados.roles ?? dados.Role;
        const primeiraRole = Array.isArray(roleBruta) ? roleBruta[0] : roleBruta;
        const role = primeiraRole
            ?.toString()
            .trim()
            .replace(/^Role\./i, '')
            .toUpperCase();

        if (!id || !role) {
            return null;
        }

        return {
            id,
            role,
        };
    } catch {
        return null;
    }
}

export function EventoDetalhePublico() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [evento, setEvento] = useState<Evento | null>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    const [comunicacoes, setComunicacoes] = useState<ComunicacaoEvento[]>([]);
    const [loadingComunicacoes, setLoadingComunicacoes] = useState(false);
    const [erroComunicacoes, setErroComunicacoes] = useState('');

    const [modalComunicacaoAberto, setModalComunicacaoAberto] = useState(false);
    const [aGuardarComunicacao, setAGuardarComunicacao] = useState(false);
    const [erroFormularioComunicacao, setErroFormularioComunicacao] = useState('');
    const [formComunicacao, setFormComunicacao] =
        useState<EstadoFormularioComunicacao>(FORM_COMUNICACAO_INICIAL);

    const perfilAutenticado = useMemo(() => obterPerfilAutenticado(), []);

    const podeConsultarComunicacoes = Boolean(perfilAutenticado);

    const podeGerirComunicacoes =
        perfilAutenticado?.role === 'COORDENADOR' ||
        perfilAutenticado?.role === 'PROFESSOR';

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

    useEffect(() => {
        if (!evento || !podeConsultarComunicacoes) {
            return;
        }

        carregarComunicacoesEvento(evento.id);
    }, [evento?.id, podeConsultarComunicacoes]);

    async function carregarComunicacoesEvento(idEvento: number) {
        try {
            setLoadingComunicacoes(true);
            setErroComunicacoes('');

            const dados = await eventosService.listarComunicacoesEvento(idEvento);

            setComunicacoes(dados);
        } catch (error) {
            setErroComunicacoes(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar as comunicações do evento.',
            );
        } finally {
            setLoadingComunicacoes(false);
        }
    }

    function podeRemoverComunicacao(comunicacao: ComunicacaoEvento): boolean {
        if (perfilAutenticado?.role === 'COORDENADOR') {
            return true;
        }

        if (perfilAutenticado?.role === 'PROFESSOR') {
            return comunicacao.criador?.id === perfilAutenticado.id;
        }

        return false;
    }

    function abrirModalComunicacao() {
        setErroFormularioComunicacao('');
        setModalComunicacaoAberto(true);
    }

    function fecharModalComunicacao() {
        if (aGuardarComunicacao) {
            return;
        }

        setModalComunicacaoAberto(false);
        setErroFormularioComunicacao('');
        setFormComunicacao(FORM_COMUNICACAO_INICIAL);
    }

    function atualizarCampoComunicacao<K extends keyof EstadoFormularioComunicacao>(
        campo: K,
        valor: EstadoFormularioComunicacao[K],
    ) {
        setFormComunicacao((estadoAtual) => ({
            ...estadoAtual,
            [campo]: valor,
        }));
    }

    function validarFormularioComunicacao(): string | null {
        if (!formComunicacao.titulo.trim()) {
            return 'O título da comunicação é obrigatório.';
        }

        if (!formComunicacao.mensagem.trim()) {
            return 'A mensagem da comunicação é obrigatória.';
        }

        return null;
    }

    async function submeterComunicacao(eventoSubmit: FormEvent<HTMLFormElement>) {
        eventoSubmit.preventDefault();

        if (!evento) {
            return;
        }

        const erroValidacao = validarFormularioComunicacao();

        if (erroValidacao) {
            setErroFormularioComunicacao(erroValidacao);
            return;
        }

        const payload: CriarComunicacaoEventoPayload = {
            titulo: formComunicacao.titulo.trim(),
            mensagem: formComunicacao.mensagem.trim(),
            tipo: formComunicacao.tipo,
            importante: formComunicacao.importante,
        };

        try {
            setAGuardarComunicacao(true);
            setErroFormularioComunicacao('');

            await eventosService.criarComunicacaoEvento(evento.id, payload);
            await carregarComunicacoesEvento(evento.id);

            fecharModalComunicacao();
            showToast('Comunicação publicada com sucesso.');
        } catch (error) {
            setErroFormularioComunicacao(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível publicar a comunicação.',
            );
        } finally {
            setAGuardarComunicacao(false);
        }
    }

    async function removerComunicacao(comunicacao: ComunicacaoEvento) {
        const confirmado = window.confirm(
            `Tens a certeza que queres remover a comunicação "${comunicacao.titulo}"?`,
        );

        if (!confirmado) {
            return;
        }

        try {
            await eventosService.removerComunicacaoEvento(comunicacao.id);

            setComunicacoes((estadoAtual) =>
                estadoAtual.filter((item) => item.id !== comunicacao.id),
            );

            showToast('Comunicação removida com sucesso.');
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível remover a comunicação.',
            );
        }
    }

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
                        <ButtonComponent
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => navigate('/login')}
                        >
                            Voltar ao login
                        </ButtonComponent>
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
                <div className={styles.mainColumn}>
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

                    {podeConsultarComunicacoes && (
                        <section className={styles.comunicacoesCard}>
                            <div className={styles.comunicacoesHeader}>
                                <div className={styles.comunicacoesTituloArea}>
                                    <span className={styles.sectionEyebrow}>
                                        Grupo do evento
                                    </span>
                                    <h2>Comunicações do evento</h2>
                                    <p>
                                        Informações publicadas por professores ou coordenação.
                                    </p>
                                </div>

                                {podeGerirComunicacoes && (
                                    <button
                                        type="button"
                                        className={styles.novaComunicacaoButton}
                                        onClick={abrirModalComunicacao}
                                    >
                                        + Nova comunicação
                                    </button>
                                )}
                            </div>

                            <div className={styles.comunicacoesConteudo}>
                                {loadingComunicacoes && (
                                    <p className={styles.comunicacoesTexto}>
                                        A carregar comunicações...
                                    </p>
                                )}

                                {!loadingComunicacoes && erroComunicacoes && (
                                    <p className={styles.comunicacoesErro}>
                                        {erroComunicacoes}
                                    </p>
                                )}

                                {!loadingComunicacoes &&
                                    !erroComunicacoes &&
                                    comunicacoes.length === 0 && (
                                        <p className={styles.comunicacoesTexto}>
                                            Ainda não existem comunicações para este evento.
                                        </p>
                                    )}

                                {!loadingComunicacoes &&
                                    !erroComunicacoes &&
                                    comunicacoes.length > 0 && (
                                        <div className={styles.comunicacoesLista}>
                                            {comunicacoes.map((comunicacao) => (
                                                <article
                                                    key={comunicacao.id}
                                                    className={`${styles.comunicacaoItem} ${
                                                        comunicacao.importante
                                                            ? styles.comunicacaoImportante
                                                            : ''
                                                    }`}
                                                >
                                                    <div
                                                        className={
                                                            styles.comunicacaoBadges
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.comunicacaoTipo
                                                            }
                                                        >
                                                            {obterEtiquetaTipoComunicacao(
                                                                comunicacao.tipo,
                                                            )}
                                                        </span>

                                                        {comunicacao.importante && (
                                                            <span
                                                                className={
                                                                    styles.comunicacaoDestaque
                                                                }
                                                            >
                                                                Importante
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div
                                                        className={
                                                            styles.comunicacaoCorpo
                                                        }
                                                    >
                                                        <h3>{comunicacao.titulo}</h3>
                                                        <p>{comunicacao.mensagem}</p>
                                                    </div>

                                                    <footer
                                                        className={
                                                            styles.comunicacaoFooter
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.comunicacaoMeta
                                                            }
                                                        >
                                                            <span>
                                                                Publicado por{' '}
                                                                {comunicacao.criador
                                                                    ?.nome ??
                                                                    'Utilizador'}
                                                            </span>

                                                            <span>
                                                                {formatarDataCurta(
                                                                    comunicacao.dataCriacao,
                                                                )}
                                                            </span>
                                                        </div>

                                                        {podeRemoverComunicacao(
                                                            comunicacao,
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                className={
                                                                    styles.dangerButton
                                                                }
                                                                onClick={() =>
                                                                    removerComunicacao(
                                                                        comunicacao,
                                                                    )
                                                                }
                                                            >
                                                                Remover
                                                            </button>
                                                        )}
                                                    </footer>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        </section>
                    )}
                </div>

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

            {modalComunicacaoAberto && (
                <div
                    className={styles.modalOverlay}
                    onMouseDown={fecharModalComunicacao}
                >
                    <section
                        className={styles.modal}
                        onMouseDown={(eventoMouse) => eventoMouse.stopPropagation()}
                    >
                        <header className={styles.modalHeader}>
                            <div>
                                <span className={styles.sectionEyebrow}>
                                    Comunicação do evento
                                </span>
                                <h2>Nova comunicação</h2>
                            </div>

                            <button
                                type="button"
                                onClick={fecharModalComunicacao}
                                aria-label="Fechar modal"
                            >
                                ×
                            </button>
                        </header>

                        <form
                            className={styles.formComunicacao}
                            onSubmit={submeterComunicacao}
                        >
                            {erroFormularioComunicacao && (
                                <div className={styles.formError}>
                                    {erroFormularioComunicacao}
                                </div>
                            )}

                            <label>
                                Título *
                                <input
                                    value={formComunicacao.titulo}
                                    onChange={(eventoInput) =>
                                        atualizarCampoComunicacao(
                                            'titulo',
                                            eventoInput.target.value,
                                        )
                                    }
                                    placeholder="Ex: Figurino obrigatório"
                                />
                            </label>

                            <label>
                                Tipo
                                <select
                                    value={formComunicacao.tipo}
                                    onChange={(eventoInput) =>
                                        atualizarCampoComunicacao(
                                            'tipo',
                                            eventoInput.target
                                                .value as TipoComunicacaoEvento,
                                        )
                                    }
                                >
                                    {TIPOS_COMUNICACAO.map((tipo) => (
                                        <option key={tipo.valor} value={tipo.valor}>
                                            {tipo.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Mensagem *
                                <textarea
                                    value={formComunicacao.mensagem}
                                    onChange={(eventoInput) =>
                                        atualizarCampoComunicacao(
                                            'mensagem',
                                            eventoInput.target.value,
                                        )
                                    }
                                    placeholder="Escreve a informação que deve ser partilhada com o grupo."
                                    rows={5}
                                />
                            </label>

                            <label className={styles.checkboxLinha}>
                                <input
                                    type="checkbox"
                                    checked={formComunicacao.importante}
                                    onChange={(eventoInput) =>
                                        atualizarCampoComunicacao(
                                            'importante',
                                            eventoInput.target.checked,
                                        )
                                    }
                                />
                                Marcar como importante
                            </label>

                            <footer className={styles.modalFooter}>
                                <button
                                    type="button"
                                    onClick={fecharModalComunicacao}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={aGuardarComunicacao}
                                >
                                    {aGuardarComunicacao
                                        ? 'A publicar...'
                                        : 'Publicar comunicação'}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
