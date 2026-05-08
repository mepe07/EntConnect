import { ButtonComponent } from '~/components/button/button.component';
import { showToast } from '~/components/toast/toast';


import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { eventosService } from '~/services/eventos.service';
import type {
    Evento,
    TipoEvento,
    FiltroEstadoEventoGestao,
    GuardarEventoPayload,
} from '~/types/eventos.types';
import styles from './painel-eventos-coordenacao.module.css';

type FiltroTipo = TipoEvento | 'todos';

type EstadoFormularioEvento = {
    titulo: string;
    slug: string;
    resumo: string;
    descricao: string;
    tipo: TipoEvento;
    local: string;
    dataInicio: string;
    dataFim: string;
    publico: boolean;
    publicado: boolean;
    destaque: boolean;
    destaqueLogin: boolean;
    ficheiroImagem: File | null;
};

const FORM_INICIAL: EstadoFormularioEvento = {
    titulo: '',
    slug: '',
    resumo: '',
    descricao: '',
    tipo: 'evento',
    local: '',
    dataInicio: '',
    dataFim: '',
    publico: true,
    publicado: false,
    destaque: false,
    destaqueLogin: false,
    ficheiroImagem: null,
};

const TIPOS_EVENTO: { valor: FiltroTipo; label: string }[] = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'evento', label: 'Evento' },
    { valor: 'workshop', label: 'Workshop' },
    { valor: 'concerto', label: 'Concerto' },
    { valor: 'audicao', label: 'Audição' },
    { valor: 'aviso', label: 'Aviso' },
    { valor: 'outro', label: 'Outro' },
];

function formatarDataInput(data?: string | null): string {
    if (!data) {
        return '';
    }

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return '';
    }

    const offsetMs = dataObj.getTimezoneOffset() * 60 * 1000;
    const dataLocal = new Date(dataObj.getTime() - offsetMs);

    return dataLocal.toISOString().slice(0, 16);
}

function formatarDataCurta(data: string): string {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
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
        outro: 'Outro',
    };

    return etiquetas[tipo] ?? 'Evento';
}

function criarFormularioDeEvento(evento: Evento): EstadoFormularioEvento {
    return {
        titulo: evento.titulo ?? '',
        slug: evento.slug ?? '',
        resumo: evento.resumo ?? '',
        descricao: evento.descricao ?? '',
        tipo: evento.tipo,
        local: evento.local ?? '',
        dataInicio: formatarDataInput(evento.dataInicio),
        dataFim: formatarDataInput(evento.dataFim),
        publico: evento.publico,
        publicado: evento.publicado,
        destaque: evento.destaque,
        destaqueLogin: evento.destaqueLogin,
        ficheiroImagem: null,
    };
}

export function PainelEventosCoordenacao() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [pesquisa, setPesquisa] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>('todos');
    const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoEventoGestao>('ativos');

    const [searchParams, setSearchParams] = useSearchParams();

    const [modalAberto, setModalAberto] = useState(false);
    const [eventoEdicao, setEventoEdicao] = useState<Evento | null>(null);
    const [form, setForm] = useState<EstadoFormularioEvento>(FORM_INICIAL);
    const [previewImagem, setPreviewImagem] = useState('');
    const [aGuardar, setAGuardar] = useState(false);
    const [erroFormulario, setErroFormulario] = useState('');

    useEffect(() => {
        carregarEventos();
    }, [pesquisa, tipoFiltro, estadoFiltro]);

    async function carregarEventos() {
        try {
            setLoading(true);
            setErro('');

            const ativo =
                estadoFiltro === 'ativos'
                    ? true
                    : estadoFiltro === 'removidos'
                        ? false
                        : undefined;

            const dados = await eventosService.listarEventosGestao({
                pesquisa,
                tipo: tipoFiltro,
                ativo,
                limite: 100,
            });

            setEventos(dados);
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar os eventos.'
            );
        } finally {
            setLoading(false);
        }
    }

    const estatisticas = useMemo(() => {
        return {
            total: eventos.length,
            publicados: eventos.filter((evento) => evento.publicado && evento.ativo).length,
            rascunhos: eventos.filter((evento) => !evento.publicado && evento.ativo).length,
            login: eventos.filter((evento) => evento.destaqueLogin && evento.ativo).length,
        };
    }, [eventos]);

    useEffect(() => {
        if (!loading && searchParams.get('novo') === 'true') {
            abrirCriacao();
            
            // O parametro e consumido para evitar reabrir o modal ao navegar para tras.
            searchParams.delete('novo');
            setSearchParams(searchParams, { replace: true });
        }
    }, [loading, searchParams, setSearchParams]);

    function abrirCriacao() {
        setEventoEdicao(null);
        setForm(FORM_INICIAL);
        setPreviewImagem('');
        setErroFormulario('');
        setModalAberto(true);
    }

    function abrirEdicao(evento: Evento) {
        setEventoEdicao(evento);
        setForm(criarFormularioDeEvento(evento));
        setPreviewImagem(evento.imagem ?? '');
        setErroFormulario('');
        setModalAberto(true);
    }

    function fecharModal() {
        if (aGuardar) {
            return;
        }

        setModalAberto(false);
        setEventoEdicao(null);
        setForm(FORM_INICIAL);
        setPreviewImagem('');
        setErroFormulario('');
    }

    function atualizarCampo<K extends keyof EstadoFormularioEvento>(
        campo: K,
        valor: EstadoFormularioEvento[K],
    ) {
        setForm((estadoAtual) => ({
            ...estadoAtual,
            [campo]: valor,
        }));
    }

    function selecionarImagem(eventoInput: React.ChangeEvent<HTMLInputElement>) {
        const ficheiro = eventoInput.target.files?.[0] ?? null;

        atualizarCampo('ficheiroImagem', ficheiro);

        if (ficheiro) {
            setPreviewImagem(URL.createObjectURL(ficheiro));
        } else {
            setPreviewImagem(eventoEdicao?.imagem ?? '');
        }
    }

    function validarFormulario(): string | null {
        if (!form.titulo.trim()) {
            return 'O título é obrigatório.';
        }

        if (!form.dataInicio) {
            return 'A data de início é obrigatória.';
        }

        if (form.dataFim && new Date(form.dataFim) < new Date(form.dataInicio)) {
            return 'A data de fim não pode ser anterior à data de início.';
        }

        return null;
    }

    async function submeterFormulario(eventoSubmit: React.FormEvent<HTMLFormElement>) {
        eventoSubmit.preventDefault();

        const erroValidacao = validarFormulario();

        if (erroValidacao) {
            setErroFormulario(erroValidacao);
            return;
        }

        const payload: GuardarEventoPayload = {
            titulo: form.titulo,
            slug: form.slug,
            resumo: form.resumo,
            descricao: form.descricao,
            tipo: form.tipo,
            local: form.local,
            dataInicio: form.dataInicio,
            dataFim: form.dataFim,
            publico: form.publico,
            publicado: form.publicado,
            destaque: form.destaque,
            destaqueLogin: form.destaqueLogin,
            ficheiroImagem: form.ficheiroImagem,
        };

        try {
            setAGuardar(true);
            setErroFormulario('');

            if (eventoEdicao) {
                await eventosService.atualizarEvento(eventoEdicao.id, payload);
            } else {
                await eventosService.criarEvento(payload);
            }

            fecharModal();
            await carregarEventos();
        } catch (error) {
            setErroFormulario(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível guardar o evento.'
            );
        } finally {
            setAGuardar(false);
        }
    }

    async function removerEvento(evento: Evento) {
        const confirmado = window.confirm(
            `Tens a certeza que queres remover o evento "${evento.titulo}"?`
        );

        if (!confirmado) {
            return;
        }

        try {
            await eventosService.removerEvento(evento.id);
            await carregarEventos();
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível remover o evento.'
            );
        }
    }

    async function reativarEvento(evento: Evento) {
        try {
            await eventosService.reativarEvento(evento.id);
            await carregarEventos();
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível reativar o evento.'
            );
        }
    }

    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.eyebrow}>Área da coordenação</span>
                    <h1>Gestão de Eventos</h1>
                    <p>
                        Cria, publica, destaca e remove eventos que aparecem na página pública,
                        na dashboard e no toast do login.
                    </p>
                </div>

                <ButtonComponent type="button" className={styles.primaryButton} onClick={abrirCriacao}>
                    <i className="fa-solid fa-plus"></i>
                    Novo evento
                </ButtonComponent>
            </section>

            <section className={styles.statsGrid}>
                <article>
                    <span>Total filtrado</span>
                    <strong>{estatisticas.total}</strong>
                </article>

                <article>
                    <span>Publicados</span>
                    <strong>{estatisticas.publicados}</strong>
                </article>

                <article>
                    <span>Rascunhos</span>
                    <strong>{estatisticas.rascunhos}</strong>
                </article>

                <article>
                    <span>No login</span>
                    <strong>{estatisticas.login}</strong>
                </article>
            </section>

            <section className={styles.filtersCard}>
                <div className={styles.searchBox}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="search"
                        value={pesquisa}
                        onChange={(evento) => setPesquisa(evento.target.value)}
                        placeholder="Pesquisar por título, local ou descrição..."
                    />
                </div>

                <select
                    value={tipoFiltro}
                    onChange={(evento) => setTipoFiltro(evento.target.value as FiltroTipo)}
                >
                    {TIPOS_EVENTO.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                            {tipo.label}
                        </option>
                    ))}
                </select>

                <select
                    value={estadoFiltro}
                    onChange={(evento) =>
                        setEstadoFiltro(evento.target.value as FiltroEstadoEventoGestao)
                    }
                >
                    <option value="ativos">Ativos</option>
                    <option value="removidos">Removidos</option>
                    <option value="todos">Todos</option>
                </select>
            </section>

            {loading && (
                <section className={styles.emptyCard}>
                    A carregar eventos...
                </section>
            )}

            {!loading && erro && (
                <section className={styles.emptyCard}>
                    {erro}
                </section>
            )}

            {!loading && !erro && eventos.length === 0 && (
                <section className={styles.emptyCard}>
                    Ainda não existem eventos para estes filtros.
                </section>
            )}

            {!loading && !erro && eventos.length > 0 && (
                <section className={styles.eventGrid}>
                    {eventos.map((evento) => (
                        <article
                            key={evento.id}
                            className={`${styles.eventCard} ${!evento.ativo ? styles.eventCardRemoved : ''}`}
                        >
                            <div className={styles.cardImage}>
                                {evento.imagem ? (
                                    <img src={evento.imagem} alt={evento.titulo} />
                                ) : (
                                    <span>🎭</span>
                                )}
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.cardMeta}>
                                    <span className={styles.badge}>
                                        {obterEtiquetaTipo(evento.tipo)}
                                    </span>

                                    {evento.publicado ? (
                                        <span className={styles.badgeSuccess}>Publicado</span>
                                    ) : (
                                        <span className={styles.badgeMuted}>Rascunho</span>
                                    )}

                                    {!evento.ativo && (
                                        <span className={styles.badgeDanger}>Removido</span>
                                    )}

                                    {evento.destaqueLogin && evento.ativo && (
                                        <span className={styles.badgeLogin}>Toast login</span>
                                    )}
                                </div>

                                <h2>{evento.titulo}</h2>

                                {evento.resumo && (
                                    <p>{evento.resumo}</p>
                                )}

                                <div className={styles.cardInfo}>
                                    <span>
                                        <i className="fa-regular fa-calendar"></i>
                                        {formatarDataCurta(evento.dataInicio)}
                                    </span>

                                    {evento.local && (
                                        <span>
                                            <i className="fa-solid fa-location-dot"></i>
                                            {evento.local}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.cardActions}>
                                    {evento.publico && evento.publicado && evento.ativo && (
                                        <Link
                                            to={`/eventos/${evento.slug}`}
                                            className={styles.secondaryAction}
                                            target="_blank"
                                        >
                                            Ver público
                                        </Link>
                                    )}

                                    <ButtonComponent
                                        type="button"
                                        className={styles.secondaryAction}
                                        onClick={() => abrirEdicao(evento)}
                                    >
                                        Editar
                                    </ButtonComponent>

                                    {evento.ativo ? (
                                        <ButtonComponent
                                            type="button"
                                            className={styles.dangerAction}
                                            onClick={() => removerEvento(evento)}
                                        >
                                            Remover
                                        </ButtonComponent>
                                    ) : (
                                        <ButtonComponent
                                            type="button"
                                            className={styles.successAction}
                                            onClick={() => reativarEvento(evento)}
                                        >
                                            Reativar
                                        </ButtonComponent>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            {modalAberto && (
                <div className={styles.modalOverlay} onMouseDown={fecharModal}>
                    <section
                        className={styles.modal}
                        onMouseDown={(evento) => evento.stopPropagation()}
                    >
                        <header className={styles.modalHeader}>
                            <div>
                                <span className={styles.eyebrow}>
                                    {eventoEdicao ? 'Editar evento' : 'Novo evento'}
                                </span>
                                <h2>{eventoEdicao ? eventoEdicao.titulo : 'Criar evento'}</h2>
                            </div>

                            <ButtonComponent type="button" onClick={fecharModal}>
                                ×
                            </ButtonComponent>
                        </header>

                        <form className={styles.form} onSubmit={submeterFormulario}>
                            {erroFormulario && (
                                <div className={styles.formError}>
                                    {erroFormulario}
                                </div>
                            )}

                            <div className={styles.formGrid}>
                                <label>
                                    Título *
                                    <input
                                        value={form.titulo}
                                        onChange={(evento) =>
                                            atualizarCampo('titulo', evento.target.value)
                                        }
                                        placeholder="Ex: Workshop de Canto"
                                    />
                                </label>

                                <label>
                                    Slug
                                    <input
                                        value={form.slug}
                                        onChange={(evento) =>
                                            atualizarCampo('slug', evento.target.value)
                                        }
                                        placeholder="Gerado automaticamente se ficar vazio"
                                    />
                                </label>

                                <label>
                                    Tipo
                                    <select
                                        value={form.tipo}
                                        onChange={(evento) =>
                                            atualizarCampo('tipo', evento.target.value as TipoEvento)
                                        }
                                    >
                                        <option value="evento">Evento</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="concerto">Concerto</option>
                                        <option value="audicao">Audição</option>
                                        <option value="aviso">Aviso</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </label>

                                <label>
                                    Local
                                    <input
                                        value={form.local}
                                        onChange={(evento) =>
                                            atualizarCampo('local', evento.target.value)
                                        }
                                        placeholder="Ex: Auditório Ent'Artes"
                                    />
                                </label>

                                <label>
                                    Data início *
                                    <input
                                        type="datetime-local"
                                        value={form.dataInicio}
                                        onChange={(evento) =>
                                            atualizarCampo('dataInicio', evento.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Data fim
                                    <input
                                        type="datetime-local"
                                        value={form.dataFim}
                                        onChange={(evento) =>
                                            atualizarCampo('dataFim', evento.target.value)
                                        }
                                    />
                                </label>
                            </div>

                            <label>
                                Resumo
                                <textarea
                                    value={form.resumo}
                                    onChange={(evento) =>
                                        atualizarCampo('resumo', evento.target.value)
                                    }
                                    placeholder="Texto curto para cards, dashboard e toast."
                                    rows={3}
                                />
                            </label>

                            <label>
                                Descrição
                                <textarea
                                    value={form.descricao}
                                    onChange={(evento) =>
                                        atualizarCampo('descricao', evento.target.value)
                                    }
                                    placeholder="Descrição completa do evento."
                                    rows={5}
                                />
                            </label>

                            <div className={styles.uploadArea}>
                                <div className={styles.previewBox}>
                                    {previewImagem ? (
                                        <img src={previewImagem} alt="Pré-visualização do evento" />
                                    ) : (
                                        <span>🎭</span>
                                    )}
                                </div>

                                <label className={styles.fileLabel}>
                                    Imagem do evento
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={selecionarImagem}
                                    />
                                    <small>JPG, PNG ou WEBP até 5MB.</small>
                                </label>
                            </div>

                            <div className={styles.switchGrid}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={form.publico}
                                        onChange={(evento) =>
                                            atualizarCampo('publico', evento.target.checked)
                                        }
                                    />
                                    Público
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={form.publicado}
                                        onChange={(evento) =>
                                            atualizarCampo('publicado', evento.target.checked)
                                        }
                                    />
                                    Publicado
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={form.destaque}
                                        onChange={(evento) =>
                                            atualizarCampo('destaque', evento.target.checked)
                                        }
                                    />
                                    Destaque
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={form.destaqueLogin}
                                        onChange={(evento) =>
                                            atualizarCampo('destaqueLogin', evento.target.checked)
                                        }
                                    />
                                    Toast do login
                                </label>
                            </div>

                            <footer className={styles.modalFooter}>
                                <ButtonComponent type="button" onClick={fecharModal}>
                                    Cancelar
                                </ButtonComponent>

                                <ButtonComponent type="submit" disabled={aGuardar}>
                                    {aGuardar ? 'A guardar...' : 'Guardar evento'}
                                </ButtonComponent>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
