
import './estatisticas.scss';
import { useState, useEffect } from 'react';
import { faturacaoService } from "~/services/faturacao.service";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { ButtonComponent } from '~/components/button/button.component';
import type { DadosDashboard, DadosPrevisao } from '../../../models/interfaces/estatisticas.interface';

type TipoFiltroData = 'Hoje' | 'Semana' | 'Mes' | 'Personalizado';


const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        compactDisplay: 'short'

    }).format(valor);
};

export function Estatisticas() {


    const [tipoFiltro, setTipoFiltro] = useState<TipoFiltroData>('Mes');
    const [datas, setDatas] = useState({ inicio: '', fim: '' });
    const [aCarregar, setACarregar] = useState<boolean>(false);

    const [dados, setDados] = useState<DadosDashboard | null>(null);
    const [previsao, setPrevisao] = useState<DadosPrevisao[] | null>(null);


    const aplicarFiltroRapido = (tipo: TipoFiltroData) => {
        setTipoFiltro(tipo);
        const dataFim = new Date();
        const dataInicio = new Date();

        if (tipo === 'Semana') dataInicio.setDate(dataFim.getDate() - 7);
        else if (tipo === 'Mes') dataInicio.setDate(dataFim.getDate() - 30);

        const inicioStr = dataInicio.toISOString().split('T')[0];
        const fimStr = dataFim.toISOString().split('T')[0];

        setDatas({ inicio: inicioStr, fim: fimStr });
        buscarDados(inicioStr, fimStr);
    };

    const buscarDados = async (inicio: string, fim: string) => {
        if (!inicio || !fim) return;
        setACarregar(true);
        try {
            const payload = await faturacaoService.getDashboardFinanceiro(inicio, fim);
            setDados(payload);
        } catch (error) {
            console.error('[Estatisticas] Erro ao obter dados do dashboard:', error);
        } finally {
            setACarregar(false);
        }
    };

    useEffect(() => {
        aplicarFiltroRapido('Mes');
        const carregarPrevisao = async () => {
            try {
                const dadosFuturo = await faturacaoService.getPrevisaoFinanceira();
                setPrevisao(dadosFuturo);
            } catch (error) { }
        };
        carregarPrevisao();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const CORES_PIE = ['#10b981', '#ef4444'];

    const dadosDonut = dados ? [
        { name: 'Faturado', value: dados.resumoGeral.totalPago },
        { name: 'Em Dívida', value: dados.resumoGeral.totalEmDivida }
    ] : [];


    const existemDados = dados && (dados.resumoGeral.totalPago > 0 || dados.resumoGeral.totalEmDivida > 0);

    const existemDadosFuturos = previsao && previsao.some(mes => mes.previsto > 0);


    return (
        <div className="pagina-estatisticas">
            <div className="cabecalho-estatisticas">
                <h1>Painel Estratégico</h1>
                <div className="botoes-tempo">
                    <button className={tipoFiltro === 'Hoje' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido('Hoje')}>Hoje</button>
                    <button className={tipoFiltro === 'Semana' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido('Semana')}>Últimos 7 Dias</button>
                    <button className={tipoFiltro === 'Mes' ? 'ativo' : ''} onClick={() => aplicarFiltroRapido('Mes')}>Últimos 30 Dias</button>
                    <button className={tipoFiltro === 'Personalizado' ? 'ativo' : ''} onClick={() => setTipoFiltro('Personalizado')}>Personalizado</button>
                </div>
            </div>

            {tipoFiltro === 'Personalizado' && (
                <div className="filtros-iniciais">
                    <div className="grupo-data">
                        <label>Data Início</label>
                        <input type="date" value={datas.inicio} onChange={e => setDatas({ ...datas, inicio: e.target.value })} />
                    </div>
                    <div className="grupo-data">
                        <label>Data Final</label>
                        <input type="date" value={datas.fim} onChange={e => setDatas({ ...datas, fim: e.target.value })} />
                    </div>
                    <ButtonComponent label={aCarregar ? "A processar..." : "Analisar"} disabled={aCarregar} onClick={() => buscarDados(datas.inicio, datas.fim)} icon="fa-solid fa-chart-line" />
                </div>
            )}

            {aCarregar ? (
                <div className="loading-state">A carregar inteligência financeira...</div>
            ) : dados && (
                <>

                    <div className="card-grafico-gigante">
                        <h3>Evolução de Faturação Diária</h3>
                        {existemDados ? (
                            <div className="grafico-container">
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={dados.evolucaoFinanceira} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="corFaturacao" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="data" stroke="#94a3b8" />

                                        <YAxis stroke="#94a3b8" width={80} tickFormatter={(value) => formatarMoeda(value)} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                                        <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), "Faturado"]} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="faturado" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#corFaturacao)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="empty-state-grafico">
                                <i className="fa-solid fa-folder-open"></i>
                                <p>Não existem movimentos financeiros neste período.</p>
                            </div>
                        )}
                    </div>


                    <div className="layout-grelha-dashboard">

                        <div className="card-dashboard">
                            <h3><i className="fa-solid fa-scale-balanced"></i> Índice de Cobrança</h3>
                            <div className="kpis-resumo">
                                <div className="kpi verde">
                                    <span className="label">Recebido</span>
                                    <span className="valor">{formatarMoeda(dados.resumoGeral.totalPago)}</span>
                                </div>
                                <div className="kpi vermelho">
                                    <span className="label">Em Dívida</span>
                                    <span className="valor">{formatarMoeda(dados.resumoGeral.totalEmDivida)}</span>
                                </div>
                            </div>
                            <div className="grafico-pequeno">
                                {existemDados ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={dadosDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {dadosDonut.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), "Total"]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state-grafico-pequeno">Sem dados para comparar</div>
                                )}
                            </div>
                        </div>

                        <div className="card-dashboard">
                            <h3><i className="fa-solid fa-trophy"></i> Pódio de Faturação</h3>
                            <div className="grafico-pequeno">
                                {existemDados ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={dados.topProfessores} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis type="number" stroke="#94a3b8" tickFormatter={(value) => formatarMoeda(value)} />
                                            <YAxis dataKey="nome" type="category" stroke="#64748b" fontWeight="600" width={100} />
                                            <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), "Faturou"]} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '10px' }} />
                                            <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={25} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state-grafico-pequeno">Sem dados de professores</div>
                                )}
                            </div>
                        </div>

                        <div className="card-dashboard">
                            <h3><i className="fa-solid fa-money-bill-trend-up"></i> Previsão (3 Meses)</h3>
                            <div className="grafico-pequeno">
                                {existemDadosFuturos ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={previsao || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="mes" stroke="#94a3b8" fontWeight="600" />
                                            <YAxis stroke="#94a3b8" tickFormatter={(value) => formatarMoeda(value)} fontSize="15px" />
                                            <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), "Previsto"]} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '10px' }} />
                                            <Bar dataKey="previsto" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state-grafico-pequeno">Nenhum coaching futuro agendado</div>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}