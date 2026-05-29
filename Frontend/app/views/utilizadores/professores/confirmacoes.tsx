import { ButtonComponent } from '~/components/button/button.component';
import { useEffect, useMemo, useState } from 'react';
import { profConfirmacoesService } from '~/services/profConfirmacoes.service';
import './confirmacoes.scss';
import { showToast } from '~/components/toast/toast';

interface SessaoPendente {
    idCoaching: number;
    dataInicio: string;
    duracaoMinutos: number;
    modalidade?: string;
    sala?: string;
    estado?: string;
    alunos?: Array<{ idAluno?: number; nome?: string }>;
}

function normalizarTexto(valor: string) {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function formatData(dataIso: string) {
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return 'Data inválida';

    return data.toLocaleDateString('pt-PT');
}

function formatHorario(dataIso: string, duracaoMinutos: number) {
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return 'Horário inválido';

    const horaInicio = data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    if (!duracaoMinutos) return horaInicio;

    const dataFim = new Date(data.getTime() + duracaoMinutos * 60000);
    const horaFim = dataFim.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    return `${horaInicio} - ${horaFim}`;
}

export default function Confirmacoes() {
    const [sessoes, setSessoes] = useState<SessaoPendente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoPendente | null>(null);
    const [isAguardar, setIsAguardar] = useState(false);

    const loadSessoes = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await profConfirmacoesService.getSessoesPendentes();
            setSessoes(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessoes();
    }, []);

    const handleConfirmar = async (sessao: SessaoPendente) => {
        setIsAguardar(true);
        try {
            showToast('A confirmar sessão...');
            await profConfirmacoesService.confirmarSessao(sessao.idCoaching);

            setSessoes((sessoesAnteriores) =>
                sessoesAnteriores.filter((item) => item.idCoaching !== sessao.idCoaching)
            );
            setSessaoSelecionada(null);
            showToast('Sessão confirmada com sucesso.');
        } catch (err: any) {
            showToast(err.message);
        } finally {
            setIsAguardar(false);
        }
    };

    const sessoesFiltradas = useMemo(() => {
        const termo = normalizarTexto(searchTerm.trim());

        return sessoes
            .filter((sessao) => {
                if (!termo) return true;
                const alunos = (sessao.alunos ?? []).map((aluno) => aluno.nome ?? '').join(' ');

                return normalizarTexto([
                    formatData(sessao.dataInicio),
                    formatHorario(sessao.dataInicio, sessao.duracaoMinutos),
                    sessao.modalidade ?? '',
                    sessao.sala ?? '',
                    sessao.estado ?? '',
                    alunos,
                ].join(' ')).includes(termo);
            })
            .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
    }, [sessoes, searchTerm]);

    const sessoesPorData = useMemo(() => {
        const grupos = new Map<string, SessaoPendente[]>();

        sessoesFiltradas.forEach((sessao) => {
            const data = formatData(sessao.dataInicio);
            const entrada = grupos.get(data) ?? [];
            entrada.push(sessao);
            grupos.set(data, entrada);
        });

        return Array.from(grupos.entries()).map(([data, items]) => ({ data, items }));
    }, [sessoesFiltradas]);

    function renderAlunos(sessao: SessaoPendente) {
        const alunos = sessao.alunos ?? [];

        if (alunos.length === 0) {
            return <span className="aluno-chip muted">Sem alunos</span>;
        }

        return alunos.map((aluno, index) => (
            <span key={aluno.idAluno ?? `${aluno.nome}-${index}`} className="aluno-chip">
                {aluno.nome ?? 'Aluno'}
            </span>
        ));
    }

    if (loading) return <div className="confirmacoes-status">A carregar sessões para confirmar...</div>;

    return (
        <div className="confirmacoes-container">
            <div className="view-header">
                <h1>Confirmações de Coaching</h1>
                <p>Estas são as sessões já passadas que ainda precisam de confirmação.</p>
            </div>

            {error && <div className="status-error">{error}</div>}

            <div className="confirmacoes-toolbar">
                <div className="confirmacoes-search">
                    <label htmlFor="pesquisa-confirmacoes-prof">Pesquisa</label>
                    <input
                        id="pesquisa-confirmacoes-prof"
                        type="search"
                        placeholder="Procurar por aluno, modalidade, sala..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="confirmacoes-summary">
                    <strong>{sessoesFiltradas.length}</strong>
                    <span>{sessoesFiltradas.length === 1 ? 'sessão pendente' : 'sessões pendentes'}</span>
                </div>
            </div>

            <div className="confirmacoes-list">
                {sessoesPorData.length === 0 ? (
                    <div className="empty-state">Nenhuma sessão pendente encontrada.</div>
                ) : (
                    sessoesPorData.map((grupo) => (
                        <section key={grupo.data} className="confirmacoes-day-group">
                            <h2>{grupo.data}</h2>
                            <div className="confirmacoes-cards">
                                {grupo.items.map((sessao) => (
                                    <article key={sessao.idCoaching} className="confirmacao-card">
                                        <div className="confirmacao-card-main">
                                            <div className="confirmacao-meta">
                                                <span>{formatData(sessao.dataInicio)}</span>
                                                <span>{formatHorario(sessao.dataInicio, sessao.duracaoMinutos)}</span>
                                                <span className="estado-badge">{sessao.estado || 'Pendente'}</span>
                                            </div>
                                            <h3>{sessao.modalidade || 'Coaching'}</h3>
                                            {sessao.sala && <p>{sessao.sala}</p>}
                                            <div className="alunos-list" aria-label="Alunos">
                                                {renderAlunos(sessao)}
                                            </div>
                                        </div>

                                        <div className="confirmacao-actions">
                                            <ButtonComponent
                                                type="button"
                                                className="btn-card-icon"
                                                tooltip="Ver detalhes da sessão"
                                                onClick={() => setSessaoSelecionada(sessao)}
                                            >
                                                <i className="fa-solid fa-eye" />
                                            </ButtonComponent>
                                            <ButtonComponent
                                                type="button"
                                                className="btn-card-confirmar"
                                                onClick={() => handleConfirmar(sessao)}
                                                disabled={isAguardar}
                                            >
                                                <i className="fa-solid fa-check" />
                                                Realizada
                                            </ButtonComponent>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {sessaoSelecionada && (
                <div className="modal-overlay" onClick={() => setSessaoSelecionada(null)}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={() => setSessaoSelecionada(null)} aria-label="Fechar">
                                <i className="fa-solid fa-xmark" />
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{formatData(sessaoSelecionada.dataInicio)} | {formatHorario(sessaoSelecionada.dataInicio, sessaoSelecionada.duracaoMinutos)}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade || 'Coaching'}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado || 'Pendente'}</strong></div>
                            <div className="detalhe-item"><span>Sala</span><strong>{sessaoSelecionada.sala || 'Não definida'}</strong></div>
                        </div>

                        <h3>Alunos Inscritos ({sessaoSelecionada.alunos?.length ?? 0})</h3>
                        <div className="lista-alunos-modal">
                            {(sessaoSelecionada.alunos ?? []).map((aluno, index) => (
                                <div key={aluno.idAluno ?? index} className="aluno-modal-row">
                                    <div className="aluno-modal-info">
                                        <i className="fa-solid fa-user"></i>
                                        <span>{aluno.nome ?? 'Aluno'}</span>
                                    </div>
                                </div>
                            ))}
                            {(sessaoSelecionada.alunos?.length ?? 0) === 0 && (
                                <p className="empty-modal-list">Sem alunos inscritos.</p>
                            )}
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-card-confirmar" onClick={() => handleConfirmar(sessaoSelecionada)} disabled={isAguardar}>
                                Realizada
                            </ButtonComponent>
                            <ButtonComponent className="btn-fechar" onClick={() => setSessaoSelecionada(null)}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {isAguardar && (
                <div className="confirmacoes-loading">
                    A atualizar a confirmação...
                </div>
            )}
        </div>
    );
}
