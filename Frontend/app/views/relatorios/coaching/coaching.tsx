import { ButtonComponent } from '~/components/button/button.component';
import React, { useState, useEffect } from 'react';
import { coachingService } from '~/services/coaching.service';
import { faturacaoService } from '~/services/faturacao.service';
import type { ResumoFaturacao } from '~/models/interfaces/faturacao.interface';
import './coaching.scss';

interface MarcacaoCoaching {
    idCoaching: number;
    dataInicio: string;
    duracaoMinutos: number;
    sala: string;
    modalidade: string;
    alunos: string[];
    estado: string;
}

type FiltroRapido = 'Hoje' | 'Esta semana' | 'Mês atual' | 'Personalizado';

export default function ListagemCoaching() {
    const [marcacoes, setMarcacoes] = useState<MarcacaoCoaching[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [relatorio, setRelatorio] = useState<{
        totalAlunos: number;
        faturacaoPorEstudio: ResumoFaturacao[];
        faturacaoPorModalidade: ResumoFaturacao[];
    } | null>(null);
    const [filtroSelecionado, setFiltroSelecionado] = useState<{ tipo: 'estudio' | 'modalidade'; valor: string } | null>(null);
    const [filtroRapidoAtivo, setFiltroRapidoAtivo] = useState<FiltroRapido>('Personalizado');
    const [abaTopAtiva, setAbaTopAtiva] = useState<'estudio' | 'modalidade'>('estudio');

    const [dataInicioInput, setDataInicioInput] = useState('');
    const [dataFimInput, setDataFimInput] = useState('');

    const [filtroDataInicio, setFiltroDataInicio] = useState('aguardar');
    const [filtroDataFim, setFiltroDataFim] = useState('aguardar');

    useEffect(() => {
        carregarAgenda();
    }, []);

    const carregarAgenda = async () => {
        setACarregar(true);
        try {
            const dados = await coachingService.getMarcacoes();
            setMarcacoes(dados);
        } catch (erro) {
            console.error("Erro ao carregar marcações", erro);
        } finally {
            setACarregar(false);
        }
    };

    const formatarDataInput = (data: Date) => {
        const dataLocal = new Date(data.getFullYear(), data.getMonth(), data.getDate());
        const offsetTimezone = dataLocal.getTimezoneOffset() * 60000;
        return new Date(dataLocal.getTime() - offsetTimezone).toISOString().split('T')[0];
    };

    const obterPeriodoHoje = () => {
        const hoje = new Date();
        const iso = formatarDataInput(hoje);
        return { dataInicio: iso, dataFim: iso };
    };

    const obterPeriodoSemanaAtual = () => {
        const hoje = new Date();
        const diaSemana = hoje.getDay();
        const diferencaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
        const segunda = new Date(hoje);
        segunda.setDate(hoje.getDate() + diferencaSegunda);
        const domingo = new Date(segunda);
        domingo.setDate(segunda.getDate() + 6);
        return {
            dataInicio: formatarDataInput(segunda),
            dataFim: formatarDataInput(domingo),
        };
    };

    const obterPeriodoMesAtual = () => {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return {
            dataInicio: formatarDataInput(primeiroDia),
            dataFim: formatarDataInput(ultimoDia),
        };
    };

    const carregarRelatorio = async (periodo?: { dataInicio: string; dataFim: string }) => {
        const inicio = periodo?.dataInicio ?? dataInicioInput;
        const fim = periodo?.dataFim ?? dataFimInput;
        if (!inicio || !fim) return;

        setACarregar(true);
        try {
            const dados = await faturacaoService.getRelatorio(inicio, fim);
            setRelatorio({
                totalAlunos: dados.totalAlunos,
                faturacaoPorEstudio: dados.faturacaoPorEstudio,
                faturacaoPorModalidade: dados.faturacaoPorModalidade,
            });
        } catch (erro) {
            console.error('Erro ao carregar relatório de coaching', erro);
        } finally {
            setACarregar(false);
        }
    };

    const aplicarFiltro = () => {
        setFiltroDataInicio(dataInicioInput);
        setFiltroDataFim(dataFimInput);
        setFiltroSelecionado(null);
        carregarRelatorio();
    };

    const aplicarFiltroRapido = (periodo: { dataInicio: string; dataFim: string }, nome: FiltroRapido) => {
        setFiltroRapidoAtivo(nome);
        setDataInicioInput(periodo.dataInicio);
        setDataFimInput(periodo.dataFim);
        setFiltroDataInicio(periodo.dataInicio);
        setFiltroDataFim(periodo.dataFim);
        setFiltroSelecionado(null);
        carregarRelatorio(periodo);
    };

    const aplicarFiltroPersonalizado = () => {
        setFiltroRapidoAtivo('Personalizado');
    };


const renderBadgeEstado = (estado: string) => {
    const e = estado?.toUpperCase();
    switch (e) {
        case 'VALIDADO':
        case 'ACEITE':
            return <span className="badge-estado validado">Validado</span>;
        case 'PENDENTE':
            return <span className="badge-estado pendente">Pendente</span>;
        case 'RECUSADO':
            return <span className="badge-estado recusado">Recusado</span>;
        default:
            return <span className="badge-estado">{estado}</span>;
    }
};

    const marcacoesFiltradas = marcacoes.filter(aula => {
        if (filtroDataInicio === 'aguardar' && filtroDataFim === 'aguardar') return false;
        if (filtroDataInicio === '' && filtroDataFim === '') return true;

        const dataAula = new Date(aula.dataInicio).getTime();
        let passaInicio = true;
        let passaFim = true;

        if (filtroSelecionado?.tipo === 'estudio' && aula.sala !== filtroSelecionado.valor) return false;
        if (filtroSelecionado?.tipo === 'modalidade' && aula.modalidade !== filtroSelecionado.valor) return false;

        if (filtroDataInicio && filtroDataInicio !== 'aguardar') {
            const dataMinima = new Date(filtroDataInicio);
            dataMinima.setHours(0, 0, 0, 0);
            passaInicio = dataAula >= dataMinima.getTime();
        }

        if (filtroDataFim && filtroDataFim !== 'aguardar') {
            const dataMaxima = new Date(filtroDataFim);
            dataMaxima.setHours(23, 59, 59, 999);
            passaFim = dataAula <= dataMaxima.getTime();
        }

        return passaInicio && passaFim;
    });
    const itensTopAtivo = relatorio
        ? (abaTopAtiva === 'estudio' ? relatorio.faturacaoPorEstudio : relatorio.faturacaoPorModalidade).slice(0, 5)
        : [];

    return (
        <div className="coaching-container">
            <div className="cabecalho-pagina">
                <div>
                    <h1>Relatório de Coaching</h1>
                    <p>Visão geral dos estúdios, modalidades e alunos com possibilidade de explorar sessões detalhadas.</p>
                </div>
                <div className="botoes-tempo" aria-label="Filtros rápidos de data">
                    <button className={filtroRapidoAtivo === 'Hoje' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido(obterPeriodoHoje(), 'Hoje')}>
                        Hoje
                    </button>
                    <button className={filtroRapidoAtivo === 'Esta semana' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido(obterPeriodoSemanaAtual(), 'Esta semana')}>
                        Esta semana
                    </button>
                    <button className={filtroRapidoAtivo === 'Mês atual' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido(obterPeriodoMesAtual(), 'Mês atual')}>
                        Mês atual
                    </button>
                    <button className={filtroRapidoAtivo === 'Personalizado' ? 'ativo' : ''} onClick={aplicarFiltroPersonalizado}>
                        Personalizado
                    </button>
                </div>
            </div>

            {filtroRapidoAtivo === 'Personalizado' && (
                <div className="filtros-iniciais">
                    <div className="pesquisa-periodo">
                        <div className="grupo-data">
                            <label>Data Início</label>
                            <input type="date" value={dataInicioInput} onChange={(e) => setDataInicioInput(e.target.value)} />
                        </div>
                        <div className="grupo-data">
                            <label>Data Final</label>
                            <input type="date" value={dataFimInput} onChange={(e) => setDataFimInput(e.target.value)} />
                        </div>
                        <ButtonComponent className="btn-pesquisar" onClick={aplicarFiltro}>
                            <i className="fa-solid fa-magnifying-glass"></i> Pesquisar
                        </ButtonComponent>
                    </div>
                </div>
            )}

            {relatorio && (
                <>
                    <div className="resumo-geral-grid">
                        <div className="resumo-card">
                            <span className="resumo-card-titulo">Total de alunos únicos</span>
                            <strong className="resumo-card-valor">{relatorio.totalAlunos}</strong>
                        </div>
                        <div className="resumo-card">
                            <span className="resumo-card-titulo">Estúdio com mais faturação</span>
                            <strong className="resumo-card-valor">{relatorio.faturacaoPorEstudio[0]?.nome || 'Nenhum'}</strong>
                            <span className="resumo-card-subtexto">{relatorio.faturacaoPorEstudio[0] ? `${relatorio.faturacaoPorEstudio[0].totalFaturado.toFixed(2)}€` : ''}</span>
                        </div>
                        <div className="resumo-card">
                            <span className="resumo-card-titulo">Modalidade com mais faturação</span>
                            <strong className="resumo-card-valor">{relatorio.faturacaoPorModalidade[0]?.nome || 'Nenhum'}</strong>
                            <span className="resumo-card-subtexto">{relatorio.faturacaoPorModalidade[0] ? `${relatorio.faturacaoPorModalidade[0].totalFaturado.toFixed(2)}€` : ''}</span>
                        </div>
                    </div>
                    <div className="resumo-listas">
                        <div className="resumo-lista">
                            <div className="resumo-lista-cabecalho">
                                <div className="tabs-top" role="tablist" aria-label="Top 5">
                                    <button
                                        type="button"
                                        className={abaTopAtiva === 'estudio' ? 'ativo' : ''}
                                        onClick={() => setAbaTopAtiva('estudio')}
                                    >
                                        Top 5 Estúdios
                                    </button>
                                    <button
                                        type="button"
                                        className={abaTopAtiva === 'modalidade' ? 'ativo' : ''}
                                        onClick={() => setAbaTopAtiva('modalidade')}
                                    >
                                        Top 5 Modalidades
                                    </button>
                                </div>
                            </div>
                            <ul>
                                {itensTopAtivo.map((item) => (
                                    <li key={`${abaTopAtiva}-${item.nome}`} className={filtroSelecionado?.tipo === abaTopAtiva && filtroSelecionado.valor === item.nome ? 'ativo' : ''} onClick={() => setFiltroSelecionado({ tipo: abaTopAtiva, valor: item.nome })}>
                                        <div className="resumo-lista-info">
                                            <strong>{item.nome}</strong>
                                            <span>{item.alunos} alunos</span>
                                        </div>
                                        <span className="resumo-lista-valor">{item.totalFaturado.toFixed(2)}€</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            )}

            {filtroDataInicio !== 'aguardar' && (
                <div className="tabela-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Duração</th>
                                <th>Sala</th>
                                <th>Estado</th>
                                <th>Alunos Inscritos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marcacoesFiltradas.length > 0 ? (
                                marcacoesFiltradas.map((aula) => (
                                    <tr key={aula.idCoaching}>
                                        <td><strong>{new Date(aula.dataInicio).toLocaleDateString('pt-PT')}</strong></td>
                                        <td>{new Date(aula.dataInicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{aula.duracaoMinutos} min</td>
                                        <td>{aula.sala}</td>
                                        <td>{renderBadgeEstado(aula.estado)}</td>
                                        <td>{aula.alunos.join(', ')}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="sem-dados">
                                        Não foram encontradas marcações para estas datas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
