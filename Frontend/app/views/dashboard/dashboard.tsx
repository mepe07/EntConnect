import { ButtonComponent } from '~/components/button/button.component';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AuthService } from '~/services/auth.service';
import { ResumoEventosDashboard } from '~/components/eventos/resumo-eventos-dashboard.component';
import type { User } from '../../models/interfaces/user.interface';

import './dashboard.scss';

type AcaoRapida = {
    id: number;
    nome: string;
    icone: string;
    visivel: boolean;
    rota: string;
    roles: string[];
};

export const ACOES_RAPIDAS_INICIAIS: AcaoRapida[] = [
    { id: 1, nome: 'Novo Bailarino', icone: 'fa-solid fa-user-plus', visivel: true, rota: '/admin/utilizadores?novo=true', roles: ['Coordenador'] },
    { id: 2, nome: 'Novo Espetáculo', icone: 'fa-solid fa-calendar-plus', visivel: true, rota: '/admin/eventos?novo=true', roles: ['Coordenador'] },
    { id: 3, nome: 'Agendar Ensaio', icone: 'fa-solid fa-music', visivel: true, rota: '/coaching/oferta?novo=true', roles: ['EncEducacao', 'Enc_Educacao'] },
    { id: 4, nome: 'Disponibilidade', icone: 'fa-solid fa-calendar-check', visivel: true, rota: '/admin/professores-disponibilidade', roles: ['Coordenador'] },
    { id: 5, nome: 'Gestão de Turmas', icone: 'fa-solid fa-users-gear', visivel: true, rota: '/admin/coaching', roles: ['Coordenador'] },
    { id: 6, nome: 'Estatística', icone: 'fa-solid fa-chart-pie', visivel: true, rota: '/relatorios/estatisticas', roles: ['Coordenador', 'Professor'] },
];

export function Dashboard() {
    const navigate = useNavigate();
    const authService = new AuthService();
    
    const userInfo = authService.getUserInfo() as User & { Acoes_Rapidas?: string | number[], idUtilizador?: number, id?: number, nome?: string };
    const roleDoUser = userInfo?.role;
    const userId = userInfo?.sub || userInfo?.idUtilizador || userInfo?.id; 
    
    const primeiroNome = useMemo(() => {
        const nomeCompleto = userInfo?.nome || userInfo?.username || '';
        return nomeCompleto.split(' ')[0];
    }, [userInfo]);

    const [editandoAcoes, setEditandoAcoes] = useState(false);
    
    const [dadosKpis, setDadosKpis] = useState({
        alunosAtivos: 0,
        aulasHoje: 0,
        tendenciaAlunos: 0,
        tendenciaAulas: 0,
        
        receitaMes: 0,
        emAtraso: 0,
        tendenciaReceita: 0, 
        tendenciaAtraso: 0,  
        
        profSessoesConcluidas: 0,
        profAulasHojeTotal: 0,
        profAulasHojeDuracao: '',
        
        eeEmAtraso: 0,
        eeSessoesConfirmar: 0,
        eeSessoesMarcadas: 0,
        eeTotalEducandos: 0,
        
        isLoading: true 
    });

    const [acoesAtivasIds, setAcoesAtivasIds] = useState<number[]>(() => {
        const cacheLocal = localStorage.getItem(`acoes_rapidas_${userId}`);
        if (cacheLocal) { try { return JSON.parse(cacheLocal); } catch(e) {} }
        const guardadas = userInfo?.Acoes_Rapidas; 
        if (typeof guardadas === 'string') { try { return JSON.parse(guardadas); } catch(e) { return []; } }
        if (Array.isArray(guardadas)) return guardadas;
        return [];
    });

    const dataHoje = useMemo(() => new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }), []);

    const acoesPermitidasPorRole = useMemo(() => ACOES_RAPIDAS_INICIAIS.filter(acao => acao.roles.includes(roleDoUser)), [roleDoUser]);
    const acoesVisiveis = useMemo(() => acoesPermitidasPorRole.filter(acao => acoesAtivasIds.includes(acao.id)), [acoesPermitidasPorRole, acoesAtivasIds]);

    // Permissoes de visualizacao dos KPIs por perfil autenticado.
    const temPermissao = (rolesPermitidas: string[]) => rolesPermitidas.includes(roleDoUser);
    const verBailarinos = temPermissao(['Coordenador', 'Professor']);
    const verFinanceiro = temPermissao(['Coordenador']);
    const verAulas = temPermissao(['Coordenador', 'Professor']);
    const verKpisEE = temPermissao(['EncEducacao', 'Enc_Educacao']);
    const verKpisProf = temPermissao(['Professor']);

    useEffect(() => {
        async function fetchKpiData() {
            try {
                const token = authService.getToken();
                if (!token) return;

                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const headers = { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                };

                const hoje = new Date();
                const ano = hoje.getFullYear();
                const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();

                const inicioStr = `${ano}-${mes}-01`;          
                const fimStr = `${ano}-${mes}-${ultimoDia}`;    

                const [resFinanceiro, resAlunos, resAulas, resEE, resProf] = await Promise.all([
                    verFinanceiro ? fetch(`${baseUrl}/faturacao/dashboard-financeiro?inicio=${inicioStr}&fim=${fimStr}`, { headers }).catch(() => null) : Promise.resolve(null),
                    verBailarinos ? fetch(`${baseUrl}/estatisticas/alunos`, { headers }).catch(() => null) : Promise.resolve(null),
                    verAulas ? fetch(`${baseUrl}/estatisticas/aulas-hoje`, { headers }).catch(() => null) : Promise.resolve(null),
                    verKpisEE && userId ? fetch(`${baseUrl}/estatisticas/encarregado/${userId}/dashboard`, { headers }).catch(() => null) : Promise.resolve(null),
                    verKpisProf && userId ? fetch(`${baseUrl}/estatisticas/professor/${userId}/dashboard?inicio=${inicioStr}&fim=${fimStr}`, { headers }).catch(() => null) : Promise.resolve(null)
                ]);

                const dFin = resFinanceiro?.ok ? await resFinanceiro.json() : {};
                const dAlu = resAlunos?.ok ? await resAlunos.json() : {};
                const dAul = resAulas?.ok ? await resAulas.json() : {};
                const dEE = resEE?.ok ? await resEE.json() : {};
                const dProf = resProf?.ok ? await resProf.json() : {};

                setDadosKpis({
                    alunosAtivos: dAlu?.total ?? dAlu?.totalAtual ?? 0, 
                    tendenciaAlunos: dAlu?.tendencia ?? 0,
                    aulasHoje: dAul?.total ?? dAul?.totalHoje ?? 0,
                    tendenciaAulas: dAul?.tendencia ?? 0,
                    
                    receitaMes: dFin?.resumoGeral?.totalPago ?? 0, 
                    emAtraso: dFin?.resumoGeral?.totalEmDivida ?? 0,   
                    tendenciaReceita: 0,
                    tendenciaAtraso: 0,
                    
                    profSessoesConcluidas: dProf?.sessoesConcluidas ?? 0,
                    profAulasHojeTotal: dProf?.aulasHojeTotal ?? 0,
                    profAulasHojeDuracao: dProf?.aulasHojeDuracao ?? '0h00min',

                    eeEmAtraso: dEE?.pagamentosAtraso ?? 0,
                    eeSessoesConfirmar: dEE?.sessoesConfirmar ?? 0,
                    eeSessoesMarcadas: dEE?.sessoesMarcadas ?? 0,
                    eeTotalEducandos: dEE?.totalEducandos ?? 0,

                    isLoading: false
                });

            } catch (error) {
                console.error("Erro geral ao carregar KPIs:", error);
                setDadosKpis(prev => ({ ...prev, isLoading: false }));
            }
        }

        fetchKpiData();
    }, [verFinanceiro, verBailarinos, verAulas, verKpisEE, verKpisProf, userId]); 

    async function alternarVisibilidade(id: number) {
        let novosIds = acoesAtivasIds.includes(id) 
            ? acoesAtivasIds.filter(aId => aId !== id) 
            : [...acoesAtivasIds, id];

        setAcoesAtivasIds(novosIds);

        try {
            if (!userId) return;
            await authService.updateQuickActionPreferences(userId, novosIds);
            localStorage.setItem(`acoes_rapidas_${userId}`, JSON.stringify(novosIds));
        } catch (error) {
            setAcoesAtivasIds(acoesAtivasIds); 
        }
    }

    const formatarEuros = (valor: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);

    const renderTendencia = (valor: number, inverso: boolean = false) => {
        if (!valor || valor === 0) return null;
        const isPositivo = valor > 0;
        const isBom = inverso ? !isPositivo : isPositivo; 
        const cor = isBom ? '#10b981' : '#ef4444';
        const icone = isPositivo ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const sinal = isPositivo ? '+' : '';

        return (
            <span style={{ fontSize: '0.8rem', color: cor, fontWeight: 'bold' }}>
                <i className={`fa-solid ${icone}`}></i> {sinal}{valor.toFixed(1)}%
            </span>
        );
    };

    return (
        <main className="dashboard-wrapper">
            <section className="dashboard-topo">
                <div className="dashboard-boas-vindas">
                    <h1>Olá, {primeiroNome}! 👋</h1>
                    <p>Aqui está o resumo para hoje, {dataHoje}.</p>
                </div>

                <div className="acoes-rapidas-container">
                    <div className="botoes-acoes-topo" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {acoesVisiveis.map((acao) => (
                            <ButtonComponent key={acao.id} type="button" className="btn-acao-mini" onClick={() => navigate(acao.rota)} title={acao.nome} aria-label={acao.nome}>
                                <i className={acao.icone}></i>
                            </ButtonComponent>
                        ))}
                        <ButtonComponent type="button" className={`btn-acao-mini editar ${editandoAcoes ? 'ativo' : ''}`} onClick={() => setEditandoAcoes(!editandoAcoes)} title="Editar ações rápidas">
                            <i className={`fa-solid ${editandoAcoes ? 'fa-check' : 'fa-pen'}`}></i>
                        </ButtonComponent>
                    </div>

                    {editandoAcoes && (
                        <div className="menu-edicao-acoes">
                            <h4>Personalizar ações</h4>
                            {acoesPermitidasPorRole.map((acao) => (
                                <div key={acao.id} className="item-edicao-mini">
                                    <span><i className={acao.icone}></i>{acao.nome}</span>
                                    <ButtonComponent type="button" onClick={() => alternarVisibilidade(acao.id)}>
                                        <i className={`fa-solid ${acoesAtivasIds.includes(acao.id) ? 'fa-toggle-on toggle-on' : 'fa-toggle-off toggle-off'}`}></i>
                                    </ButtonComponent>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {(verBailarinos || verFinanceiro || verAulas || verKpisEE || verKpisProf) && (
                <section className="kpi-grid">
                    
                    {verBailarinos && (
                        <article className="kpi-card">
                            <div className="icone azul"><i className="fa-solid fa-users"></i></div>
                            <div className="info">
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                    Bailarinos
                                    <i className="fa-solid fa-circle-info" title="Número total de bailarinos com conta ativa no sistema." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.alunosAtivos}</h3>
                                    {!dadosKpis.isLoading && renderTendencia(dadosKpis.tendenciaAlunos)}
                                </div>
                            </div>
                        </article>
                    )}

                    {verAulas && (
                        <article className="kpi-card">
                            <div className="icone roxo"><i className="fa-solid fa-masks-theater"></i></div>
                            <div className="info">
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                    Aulas & Ensaios (Geral)
                                    <i className="fa-solid fa-circle-info" title="Total global de aulas e ensaios a decorrer no dia de hoje em toda a escola." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.aulasHoje}</h3>
                                    {!dadosKpis.isLoading && renderTendencia(dadosKpis.tendenciaAulas)}
                                </div>
                            </div>
                        </article>
                    )}

                    {verFinanceiro && (
                        <>
                            <article className="kpi-card">
                                <div className="icone verde"><i className="fa-solid fa-euro-sign"></i></div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Receita do Mês
                                        <i className="fa-solid fa-circle-info" title="Soma de todos os pagamentos efetuados desde o dia 1 até ao dia de hoje." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : formatarEuros(dadosKpis.receitaMes)}</h3>
                                        {!dadosKpis.isLoading && renderTendencia(dadosKpis.tendenciaReceita)}
                                    </div>
                                </div>
                            </article>
                            <article className="kpi-card">
                                <div className="icone vermelho"><i className="fa-solid fa-triangle-exclamation"></i></div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Em Atraso (Global)
                                        <i className="fa-solid fa-circle-info" title="Valor total de faturas por liquidar em toda a escola." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : formatarEuros(dadosKpis.emAtraso)}</h3>
                                        {!dadosKpis.isLoading && renderTendencia(dadosKpis.tendenciaAtraso, true)}
                                    </div>
                                </div>
                            </article>
                        </>
                    )}

                    {verKpisProf && (
                        <>
                            <article className="kpi-card">
                                <div className="icone azul" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                                    <i className="fa-solid fa-calendar-check"></i>
                                </div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Sessões Realizadas (Mês)
                                        <i className="fa-solid fa-circle-info" title="Total de aulas e ensaios já lecionados no mês atual." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.profSessoesConcluidas}</h3>
                                    </div>
                                </div>
                            </article>

                            <article className="kpi-card">
                                <div className="icone verde" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                    <i className="fa-solid fa-chalkboard-user"></i>
                                </div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        As Minhas Aulas Hoje
                                        <i className="fa-solid fa-circle-info" title="Quantidade de sessões agendadas para hoje e respetiva duração." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>
                                            {dadosKpis.isLoading ? '...' : (
                                                dadosKpis.profAulasHojeTotal > 0 
                                                ? `${dadosKpis.profAulasHojeTotal} (${dadosKpis.profAulasHojeDuracao})`
                                                : '0'
                                            )}
                                        </h3>
                                    </div>
                                </div>
                            </article>
                        </>
                    )}

                    {verKpisEE && (
                        <>
                            <article 
                                className="kpi-card" 
                                onClick={() => navigate('/conta', { state: { abaAtiva: 'minhas_faturas' } })} 
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="icone vermelho"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Os Meus Pagamentos Pendentes
                                        <i className="fa-solid fa-circle-info" title="Total que tem em dívida." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: dadosKpis.eeEmAtraso > 0 ? '#ef4444' : '#000' }}>
                                            {dadosKpis.isLoading ? '...' : formatarEuros(dadosKpis.eeEmAtraso)}
                                        </h3>
                                    </div>
                                </div>
                            </article>

                            <article className="kpi-card">
                                <div className="icone amarelo" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                                    <i className="fa-solid fa-clock"></i>
                                </div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Sessões por Confirmar
                                        <i className="fa-solid fa-circle-info" title="Aulas ou ensaios a aguardar confirmação do professor." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.eeSessoesConfirmar}</h3>
                                    </div>
                                </div>
                            </article>

                            <article className="kpi-card">
                                <div className="icone azul"><i className="fa-regular fa-calendar-check"></i></div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Sessões Marcadas
                                        <i className="fa-solid fa-circle-info" title="Sessões agendadas para os seus educandos." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.eeSessoesMarcadas}</h3>
                                    </div>
                                </div>
                            </article>

                            <article className="kpi-card">
                                <div className="icone verde"><i className="fa-solid fa-children"></i></div>
                                <div className="info">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                                        Educandos Associados
                                        <i className="fa-solid fa-circle-info" title="Número de bailarinos associados à sua conta." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.eeTotalEducandos}</h3>
                                    </div>
                                </div>
                            </article>
                        </>
                    )}
                </section>
            )}


            <ResumoEventosDashboard />
        </main>
    );
}
