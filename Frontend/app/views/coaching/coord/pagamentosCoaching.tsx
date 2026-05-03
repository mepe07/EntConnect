import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LinhaFaturacaoCoaching } from '../../../models/interfaces/faturacao.interface';
import { faturacaoService } from '../../../services/faturacao.service';
import './pagamentosCoaching.scss';

type EstadoPagamento = 'atrasado' | 'pendente' | 'pago';

interface FiltrosPagamentos {
    inicio: string;
    fim: string;
    professor: string;
    encarregado: string;
}

const tabs: Array<{ id: EstadoPagamento; label: string; icon: string }> = [
    { id: 'atrasado', label: 'Pagamentos em atraso', icon: 'fa-solid fa-triangle-exclamation' },
    { id: 'pendente', label: 'Marcadas por pagar', icon: 'fa-solid fa-calendar-day' },
    { id: 'pago', label: 'Sessoes pagas', icon: 'fa-solid fa-circle-check' },
];

function formatMoney(valor?: number) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
    }).format(Number(valor ?? 0));
}

function formatDateTime(valor?: string | null) {
    if (!valor) {
        return 'Sem data';
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return 'Sem data';
    }

    return data.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getEstadoPagamento(pagamento: LinhaFaturacaoCoaching): EstadoPagamento {
    if (pagamento.estadoPagamento) {
        return pagamento.estadoPagamento;
    }

    const valorEmFalta = Number(pagamento.valorEmFalta ?? 0);
    const dataAula = pagamento.dataAula ? new Date(pagamento.dataAula) : null;

    if (valorEmFalta <= 0) {
        return 'pago';
    }

    if (dataAula && !Number.isNaN(dataAula.getTime()) && dataAula < new Date()) {
        return 'atrasado';
    }

    return 'pendente';
}

export default function PagamentosCoachingAdmin() {
    const [filtros, setFiltros] = useState<FiltrosPagamentos>({
        inicio: '',
        fim: '',
        professor: '',
        encarregado: '',
    });
    const [tabAtiva, setTabAtiva] = useState<EstadoPagamento>('atrasado');
    const [pagamentos, setPagamentos] = useState<LinhaFaturacaoCoaching[]>([]);
    const [aCarregar, setACarregar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [pagamentoSelecionado, setPagamentoSelecionado] = useState<LinhaFaturacaoCoaching | null>(null);
    const [valorPagamento, setValorPagamento] = useState('');
    const [aRegistar, setARegistar] = useState(false);

    async function carregarPagamentos(estado = tabAtiva, filtrosPesquisa = filtros) {
        setACarregar(true);
        setErro(null);

        try {
            const dados = await faturacaoService.getPagamentosCoaching({
                inicio: filtrosPesquisa.inicio,
                fim: filtrosPesquisa.fim,
                professor: filtrosPesquisa.professor.trim(),
                encarregado: filtrosPesquisa.encarregado.trim(),
                estado,
            });

            setPagamentos(dados);
        } catch (error) {
            console.error('Erro ao carregar pagamentos de coaching:', error);
            setErro(error instanceof Error ? error.message : 'Nao foi possivel carregar os pagamentos.');
            setPagamentos([]);
        } finally {
            setACarregar(false);
        }
    }

    useEffect(() => {
        void carregarPagamentos();
    }, []);

    const resumo = useMemo(() => {
        return pagamentos.reduce(
            (acc, pagamento) => {
                acc.total += 1;
                acc.valorTotal += Number(pagamento.valorTotal ?? 0);
                acc.valorPago += Number(pagamento.valorPago ?? 0);
                acc.valorEmFalta += Number(pagamento.valorEmFalta ?? 0);
                return acc;
            },
            {
                total: 0,
                valorTotal: 0,
                valorPago: 0,
                valorEmFalta: 0,
            },
        );
    }, [pagamentos]);

    function handleSubmitFiltros(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void carregarPagamentos();
    }

    function limparFiltros() {
        const filtrosLimpos = {
            inicio: '',
            fim: '',
            professor: '',
            encarregado: '',
        };

        setFiltros(filtrosLimpos);
        void carregarPagamentos(tabAtiva, filtrosLimpos);
    }

    function mudarTab(estado: EstadoPagamento) {
        setTabAtiva(estado);
        void carregarPagamentos(estado);
    }

    function abrirModalPagamento(pagamento: LinhaFaturacaoCoaching) {
        setPagamentoSelecionado(pagamento);
        setValorPagamento(String(Number(pagamento.valorEmFalta ?? 0).toFixed(2)));
    }

    function fecharModalPagamento() {
        setPagamentoSelecionado(null);
        setValorPagamento('');
        setARegistar(false);
    }

    async function handleRegistarPagamento(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!pagamentoSelecionado?.idAluno) {
            setErro('Nao foi possivel identificar o aluno desta sessao.');
            return;
        }

        const valor = Number(valorPagamento.replace(',', '.'));
        const valorEmFalta = Number(pagamentoSelecionado.valorEmFalta ?? 0);

        if (!Number.isFinite(valor) || valor <= 0) {
            setErro('Indica um valor de pagamento superior a zero.');
            return;
        }

        if (valor > valorEmFalta) {
            setErro('O valor do pagamento nao pode ser superior ao valor em falta.');
            return;
        }

        setARegistar(true);
        setErro(null);

        try {
            await faturacaoService.registarPagamento(
                pagamentoSelecionado.idCoaching,
                pagamentoSelecionado.idAluno,
                valor,
            );
            fecharModalPagamento();
            void carregarPagamentos();
        } catch (error) {
            console.error('Erro ao registar pagamento:', error);
            setErro(error instanceof Error ? error.message : 'Nao foi possivel registar o pagamento.');
        } finally {
            setARegistar(false);
        }
    }

    return (
        <div className="pagamentos-coaching">
            <div className="pagamentos-header">
                <div>
                    <h1>Gerir pagamentos</h1>
                    <p>Registo e consulta de pagamentos de sessoes de coaching.</p>
                </div>
            </div>

            <form className="pagamentos-filtros" onSubmit={handleSubmitFiltros}>
                <label>
                    Data inicio
                    <input
                        type="date"
                        value={filtros.inicio}
                        onChange={(event) => setFiltros({ ...filtros, inicio: event.target.value })}
                    />
                </label>
                <label>
                    Data fim
                    <input
                        type="date"
                        value={filtros.fim}
                        onChange={(event) => setFiltros({ ...filtros, fim: event.target.value })}
                    />
                </label>
                <label>
                    Professor
                    <input
                        type="search"
                        placeholder="Nome ou email"
                        value={filtros.professor}
                        onChange={(event) => setFiltros({ ...filtros, professor: event.target.value })}
                    />
                </label>
                <label>
                    Enc. educacao
                    <input
                        type="search"
                        placeholder="Nome ou email"
                        value={filtros.encarregado}
                        onChange={(event) => setFiltros({ ...filtros, encarregado: event.target.value })}
                    />
                </label>
                <div className="filtro-acoes">
                    <button type="submit" disabled={aCarregar}>
                        <i className="fa-solid fa-magnifying-glass" />
                        {aCarregar ? 'A carregar' : 'Pesquisar'}
                    </button>
                    <button type="button" className="secundario" onClick={limparFiltros}>
                        <i className="fa-solid fa-rotate-left" />
                        Limpar
                    </button>
                </div>
            </form>

            <div className="pagamentos-tabs" role="tablist" aria-label="Estados de pagamento">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={tabAtiva === tab.id ? 'ativo' : ''}
                        onClick={() => mudarTab(tab.id)}
                    >
                        <i className={tab.icon} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <section className="pagamentos-resumo" aria-label="Resumo financeiro">
                <div>
                    <span>Registos</span>
                    <strong>{resumo.total}</strong>
                </div>
                <div>
                    <span>Valor total</span>
                    <strong>{formatMoney(resumo.valorTotal)}</strong>
                </div>
                <div>
                    <span>Valor pago</span>
                    <strong>{formatMoney(resumo.valorPago)}</strong>
                </div>
                <div>
                    <span>Valor em falta</span>
                    <strong>{formatMoney(resumo.valorEmFalta)}</strong>
                </div>
            </section>

            {erro && <div className="mensagem-erro">{erro}</div>}

            <section className="pagamentos-lista" aria-live="polite">
                {aCarregar ? (
                    <div className="estado-vazio">A carregar pagamentos...</div>
                ) : pagamentos.length === 0 ? (
                    <div className="estado-vazio">Nao existem registos para os filtros selecionados.</div>
                ) : (
                    <div className="tabela-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Sessao</th>
                                    <th>Aluno</th>
                                    <th>Enc. educacao</th>
                                    <th>Professor</th>
                                    <th>Valores</th>
                                    <th>Estado</th>
                                    <th>Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentos.map((pagamento) => {
                                    const estado = getEstadoPagamento(pagamento);
                                    const podePagar = estado !== 'pago' && Number(pagamento.valorEmFalta ?? 0) > 0;

                                    return (
                                        <tr key={`${pagamento.idCoaching}-${pagamento.idAluno}`}>
                                            <td>
                                                <strong>{formatDateTime(pagamento.dataAula)}</strong>
                                                <span>{pagamento.salaNome || 'Sem sala'} | {pagamento.duracaoMinutos} min</span>
                                            </td>
                                            <td>{pagamento.nomeAluno}</td>
                                            <td>
                                                <strong>{pagamento.nomeEncarregado || 'Sem encarregado'}</strong>
                                                <span>{pagamento.emailEncarregado || 'Sem email'}</span>
                                            </td>
                                            <td>
                                                <strong>{pagamento.nomeProfessor}</strong>
                                                <span>{pagamento.emailProfessor || 'Sem email'}</span>
                                            </td>
                                            <td>
                                                <strong>{formatMoney(pagamento.valorEmFalta)}</strong>
                                                <span>{formatMoney(pagamento.valorPago)} pagos de {formatMoney(pagamento.valorTotal)}</span>
                                            </td>
                                            <td>
                                                <span className={`estado-chip ${estado}`}>
                                                    {estado === 'atrasado' ? 'Em atraso' : estado === 'pendente' ? 'Por pagar' : 'Pago'}
                                                </span>
                                            </td>
                                            <td>
                                                {podePagar ? (
                                                    <button
                                                        type="button"
                                                        className="acao-pagamento"
                                                        onClick={() => abrirModalPagamento(pagamento)}
                                                        title="Registar pagamento total ou parcial"
                                                    >
                                                        <i className="fa-solid fa-money-bill-wave" />
                                                        Registar
                                                    </button>
                                                ) : (
                                                    <span className="sem-acao">Liquidado</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {pagamentoSelecionado && (
                <div className="pagamento-modal-overlay" role="presentation">
                    <div className="pagamento-modal" role="dialog" aria-modal="true" aria-labelledby="pagamento-modal-title">
                        <div className="modal-topo">
                            <h2 id="pagamento-modal-title">Registar pagamento</h2>
                            <button type="button" onClick={fecharModalPagamento} aria-label="Fechar">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="modal-detalhes">
                            <div>
                                <span>Aluno</span>
                                <strong>{pagamentoSelecionado.nomeAluno}</strong>
                            </div>
                            <div>
                                <span>Sessao</span>
                                <strong>{formatDateTime(pagamentoSelecionado.dataAula)}</strong>
                            </div>
                            <div>
                                <span>Valor em falta</span>
                                <strong>{formatMoney(pagamentoSelecionado.valorEmFalta)}</strong>
                            </div>
                        </div>

                        <form onSubmit={handleRegistarPagamento} className="modal-form">
                            <label>
                                Valor a registar
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={Number(pagamentoSelecionado.valorEmFalta ?? 0)}
                                    value={valorPagamento}
                                    onChange={(event) => setValorPagamento(event.target.value)}
                                />
                            </label>

                            <div className="modal-acoes">
                                <button
                                    type="button"
                                    className="secundario"
                                    onClick={() => setValorPagamento(String(Number(pagamentoSelecionado.valorEmFalta ?? 0).toFixed(2)))}
                                >
                                    Pagamento total
                                </button>
                                <button type="submit" disabled={aRegistar}>
                                    {aRegistar ? 'A registar' : 'Guardar pagamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
