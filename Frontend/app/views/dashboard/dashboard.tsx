import { ButtonComponent } from '~/components/button/button.component';
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AuthService } from '~/services/auth.service';
import { ResumoEventosDashboard } from '~/components/eventos/resumo-eventos-dashboard.component';
import type { User } from '../../models/interfaces/user.interface';
import { DisponibilidadesService } from '~/services/disponibilidades.service';
import { coachingPropostasService } from '~/services/coachingPropostas.service';
import { AdminService } from '~/services/admin.service';
import { eventosService } from '~/services/eventos.service';
import type { Evento } from '~/types/eventos.types';
import { professoresService } from '~/services/professor.service';

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

type KpiConfig = {
    id: number;
    slug: string;
    nome: string;
    roles: string[];
};

type DisponibilidadeDashboard = {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    estado: string;
};

type PropostaDashboard = {
    idPedido: number;
    nomeProfessor: string;
    nomeEncEducacao: string;
    modalidade: string;
    data: string;
    horario: string;
};

type SessaoValidacaoDashboard = {
    idCoaching: number;
    nomeProfessor: string;
    modalidade: string;
    data: string;
    horario: string;
    idSala?: number | null;
    sala?: string | null;
};

type ProfessorDashboard = {
    ID_Pessoa: number;
    Pessoa: {
        Nome: string;
    };
    Professor_Modalidade?: { ID_Modalidade: number }[];
};

const NOVOS_KPI_COORD_IDS = [13, 14, 15, 16, 17];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

function normalizarNome(valor?: string | null) {
    return (valor ?? '').trim().toLowerCase();
}

function parseDashboardDataHora(data: string, horario = '00:00') {
    const [dia, mes, ano] = data.split('/').map(Number);
    const [horaInicio = '00:00'] = horario.split(' - ');
    const [hora, minuto] = horaInicio.split(':').map(Number);
    return new Date(ano, (mes || 1) - 1, dia || 1, hora || 0, minuto || 0, 0, 0);
}

async function carregarTodosProfessores() {
    const primeiraPagina = await professoresService.getProfessores(1);
    const professores = Array.isArray(primeiraPagina?.data) ? primeiraPagina.data : [];
    const ultimaPagina = Number(primeiraPagina?.meta?.lastPage ?? 1);

    if (ultimaPagina <= 1) return professores as ProfessorDashboard[];

    const restantes = await Promise.all(
        Array.from({ length: ultimaPagina - 1 }, (_, index) => professoresService.getProfessores(index + 2)),
    );

    restantes.forEach((resposta) => {
        if (Array.isArray(resposta?.data)) {
            professores.push(...resposta.data);
        }
    });

    return professores as ProfessorDashboard[];
}

export const KPIS_CONFIG_INICIAIS: KpiConfig[] = [
    { id: 1, slug: 'ocupacao', nome: 'Ocupação Estúdios ', roles: ['Coordenador'] },
    { id: 2, slug: 'faturacao_prev', nome: 'Faturação Prevista', roles: ['Coordenador'] },
    { id: 3, slug: 'receita_mes', nome: 'Receita do Mês', roles: ['Coordenador'] },
    { id: 4, slug: 'em_atraso', nome: 'Em Atraso (Global)', roles: ['Coordenador'] },
    { id: 5, slug: 'sessoes_prof', nome: 'Sessões Realizadas (Mês)', roles: ['Professor'] },
    { id: 6, slug: 'aulas_hoje_prof', nome: 'As Minhas Aulas Hoje', roles: ['Professor'] },
    { id: 7, slug: 'pendentes_ee', nome: 'Os Meus Pagamentos', roles: ['EncEducacao', 'Enc_Educacao'] },
    { id: 8, slug: 'confirmar_ee', nome: 'Sessões por Confirmar', roles: ['EncEducacao', 'Enc_Educacao'] },
    { id: 9, slug: 'marcadas_ee', nome: 'Sessões Marcadas', roles: ['EncEducacao', 'Enc_Educacao'] },
    { id: 10, slug: 'educandos_ee', nome: 'Educandos Associados', roles: ['EncEducacao', 'Enc_Educacao'] },
    { id: 11, slug: 'bailarinos', nome: 'Total de Bailarinos', roles: ['Coordenador', 'Professor'] },
    { id: 12, slug: 'aulas_geral', nome: 'Aulas & Ensaios (Geral)', roles: ['Coordenador', 'Professor'] },
    { id: 13, slug: 'prof_disp_ativa', nome: 'Professores com Disponibilidade Ativa', roles: ['Coordenador'] },
    { id: 14, slug: 'prof_sem_modalidades', nome: 'Professores sem Modalidades', roles: ['Coordenador'] },
    { id: 15, slug: 'prof_sem_sessoes', nome: 'Professores sem Sessoes Marcadas', roles: ['Coordenador'] },
    { id: 16, slug: 'dia_maior_ocupacao', nome: 'Dia com Maior Ocupacao de Coaching', roles: ['Coordenador'] },
    { id: 17, slug: 'media_alunos_sessao', nome: 'Media de Alunos por Sessao', roles: ['Coordenador'] },
];

export function Dashboard() {
    const navigate = useNavigate();
    const authService = new AuthService();
    const disponibilidadesService = new DisponibilidadesService();
    const adminService = new AdminService();
    
    const userInfo = authService.getUserInfo() as User & { Acoes_Rapidas?: string | number[], Quadros_Visualizacao?: string | string[], idUtilizador?: number, id?: number, nome?: string };
    const roleDoUser = userInfo?.role;
    const userId = userInfo?.sub || userInfo?.idUtilizador || userInfo?.id; 
    
    const isCoordenador = roleDoUser === 'Coordenador';
    
    const primeiroNome = useMemo(() => {
        const nomeCompleto = userInfo?.nome || userInfo?.username || '';
        return nomeCompleto.split(' ')[0];
    }, [userInfo]);

    const [editandoAcoes, setEditandoAcoes] = useState(false);
    const [editandoKpis, setEditandoKpis] = useState(false); 
    
    const [dadosKpis, setDadosKpis] = useState({
        ocupacaoEstudios: 0,
        faturacaoPrevistaDia: 0,
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
        professoresDisponibilidadeAtiva: 0,
        professoresSemModalidades: 0,
        professoresSemSessoesMarcadas: 0,
        diaMaiorOcupacaoCoaching: 'Sem dados',
        mediaAlunosPorSessao: 0,
        isLoading: true 
    });
    const [propostasPendentesDashboard, setPropostasPendentesDashboard] = useState<PropostaDashboard[]>([]);
    const [disponibilidadesPendentesDashboard, setDisponibilidadesPendentesDashboard] = useState<DisponibilidadeDashboard[]>([]);
    const [sessoesPorValidarDashboard, setSessoesPorValidarDashboard] = useState<SessaoValidacaoDashboard[]>([]);
    const [sessoesPendentesEstudioDashboard, setSessoesPendentesEstudioDashboard] = useState<SessaoValidacaoDashboard[]>([]);
    const [eventosDashboard, setEventosDashboard] = useState<Evento[]>([]);

    const [acoesAtivasIds, setAcoesAtivasIds] = useState<number[]>(() => {
        const cacheLocal = localStorage.getItem(`acoes_rapidas_${userId}`);
        if (cacheLocal) { try { return JSON.parse(cacheLocal); } catch(e) {} }
        const guardadas = userInfo?.Acoes_Rapidas; 
        if (typeof guardadas === 'string') { try { return JSON.parse(guardadas); } catch(e) { return []; } }
        if (Array.isArray(guardadas)) return guardadas;
        return [];
    });

    const [kpisAtivosIds, setKpisAtivosIds] = useState<number[]>(() => {
        const cacheLocal = localStorage.getItem(`kpis_visiveis_${userId}`);
        if (cacheLocal) {
            try {
                const parsed = JSON.parse(cacheLocal);
                if (Array.isArray(parsed)) {
                    return parsed.map((item: any) => typeof item === 'number' ? item : Number(item)).filter((item: number) => !Number.isNaN(item));
                }
            } catch(e) {}
        }

        const guardadas = userInfo?.Quadros_Visualizacao;
        if (typeof guardadas === 'string') {
            try {
                const parsed = JSON.parse(guardadas);
                if (Array.isArray(parsed)) {
                    return parsed.map((item: any) => typeof item === 'number' ? item : Number(item)).filter((item: number) => !Number.isNaN(item));
                }
            } catch(e) { }
        }
        if (Array.isArray(guardadas)) {
            return guardadas.map((item: any) => typeof item === 'number' ? item : Number(item)).filter((item: number) => !Number.isNaN(item));
        }

        return KPIS_CONFIG_INICIAIS.filter(kpi => kpi.roles.includes(roleDoUser)).map(k => k.id);
    });

    const dataHoje = useMemo(() => new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }), []);

    const acoesPermitidasPorRole = useMemo(() => ACOES_RAPIDAS_INICIAIS.filter(acao => acao.roles.includes(roleDoUser)), [roleDoUser]);
    const acoesVisiveis = useMemo(() => acoesPermitidasPorRole.filter(acao => acoesAtivasIds.includes(acao.id)), [acoesPermitidasPorRole, acoesAtivasIds]);

    const kpisPermitidosPorRole = useMemo(() => KPIS_CONFIG_INICIAIS.filter(kpi => kpi.roles.includes(roleDoUser)), [roleDoUser]);
    const kpisVisiveis = useMemo(() => kpisPermitidosPorRole.filter(kpi => kpisAtivosIds.includes(kpi.id)), [kpisPermitidosPorRole, kpisAtivosIds]);

    const temPermissao = (rolesPermitidas: string[]) => rolesPermitidas.includes(roleDoUser);
    const verNovosKpisCoordenador = temPermissao(['Coordenador']);
    const verFinanceiro = temPermissao(['Coordenador']);
    const verBailarinos = temPermissao(['Coordenador', 'Professor']); 
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

                const [resFinanceiro, resAlunos, resAulas, resEE, resProf, resOcupacao, resFatPrev] = await Promise.all([
                    verFinanceiro ? fetch(`${baseUrl}/faturacao/dashboard-financeiro?inicio=${inicioStr}&fim=${fimStr}`, { headers }).catch(() => null) : Promise.resolve(null),
                    verBailarinos ? fetch(`${baseUrl}/estatisticas/alunos`, { headers }).catch(() => null) : Promise.resolve(null),
                    verAulas ? fetch(`${baseUrl}/estatisticas/aulas-hoje`, { headers }).catch(() => null) : Promise.resolve(null),
                    verKpisEE && userId ? fetch(`${baseUrl}/estatisticas/encarregado/${userId}/dashboard`, { headers }).catch(() => null) : Promise.resolve(null),
                    verKpisProf && userId ? fetch(`${baseUrl}/estatisticas/professor/${userId}/dashboard?inicio=${inicioStr}&fim=${fimStr}`, { headers }).catch(() => null) : Promise.resolve(null),
                    verNovosKpisCoordenador ? fetch(`${baseUrl}/estatisticas/ocupacao-estudios-hoje`, { headers }).catch(() => null) : Promise.resolve(null),
                    verNovosKpisCoordenador ? fetch(`${baseUrl}/faturacao/prevista-hoje`, { headers }).catch(() => null) : Promise.resolve(null)
                ]);

                const dFin = resFinanceiro?.ok ? await resFinanceiro.json() : {};
                const dAlu = resAlunos?.ok ? await resAlunos.json() : {};
                const dAul = resAulas?.ok ? await resAulas.json() : {};
                const dEE = resEE?.ok ? await resEE.json() : {};
                const dProf = resProf?.ok ? await resProf.json() : {};
                const dOcup = resOcupacao?.ok ? await resOcupacao.json() : {};
                const dFatPrev = resFatPrev?.ok ? await resFatPrev.json() : {};

                setDadosKpis((prev) => ({
                    ...prev,
                    ocupacaoEstudios: dOcup?.percentagem ?? 0,
                    faturacaoPrevistaDia: dFatPrev?.valor ?? 0,
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
                }));

            } catch (error) {
                console.error("Erro geral ao carregar KPIs:", error);
                setDadosKpis(prev => ({ ...prev, isLoading: false }));
            }
        }

        fetchKpiData();
    }, [verFinanceiro, verBailarinos, verAulas, verKpisEE, verKpisProf, verNovosKpisCoordenador, userId]); 

    useEffect(() => {
        if (!isCoordenador || !userId) return;

        const chaveMigracao = `dashboard_coord_novos_kpis_v1_${userId}`;
        if (localStorage.getItem(chaveMigracao)) return;

        const proximosIds = Array.from(new Set([...kpisAtivosIds, ...NOVOS_KPI_COORD_IDS]));
        setKpisAtivosIds(proximosIds);
        localStorage.setItem(`kpis_visiveis_${userId}`, JSON.stringify(proximosIds));
        localStorage.setItem(chaveMigracao, '1');

        authService.updateQuadrosPreferences(userId, proximosIds).catch((error) => {
            console.error('Erro ao sincronizar novos KPIs da coordenadora:', error);
        });
    }, [isCoordenador, kpisAtivosIds, userId]);

    useEffect(() => {
        if (!isCoordenador) return;

        let ativo = true;

        async function fetchCoordenadorResumo() {
            try {
                const [propostas, disponibilidades, sessoesPorValidar, eventos, professores, sessoesFuturas] = await Promise.all([
                    coachingPropostasService.getPendentesAdmin().catch(() => []),
                    disponibilidadesService.getAvailability().catch(() => []),
                    adminService.getSessoesPorValidar().catch(() => []),
                    eventosService.listarEventosPublicos({ apenasFuturos: true, limite: 5 }).catch(() => []),
                    carregarTodosProfessores().catch(() => []),
                    adminService.getSessoesFuturas().catch(() => []),
                ]);

                if (!ativo) return;

                const disponibilidadesLista = Array.isArray(disponibilidades) ? disponibilidades : [];
                const professoresLista = Array.isArray(professores) ? professores : [];
                const sessoesFuturasLista = Array.isArray(sessoesFuturas) ? sessoesFuturas : [];

                const professoresComDisponibilidadeAtiva = new Set(
                    disponibilidadesLista
                        .filter((item: any) => item?.ativa !== false)
                        .map((item: any) => normalizarNome(item?.nomeProfessor))
                        .filter(Boolean),
                ).size;

                const professoresSemModalidades = professoresLista.filter(
                    (professor: ProfessorDashboard) => (professor?.Professor_Modalidade?.length ?? 0) === 0,
                ).length;

                const professoresComSessoes = new Set(
                    sessoesFuturasLista
                        .map((sessao: any) => normalizarNome(sessao?.nomeProfessor))
                        .filter(Boolean),
                );

                const professoresSemSessoesMarcadas = professoresLista.filter((professor: ProfessorDashboard) => {
                    const nomeProfessor = normalizarNome(professor?.Pessoa?.Nome);
                    return nomeProfessor && !professoresComSessoes.has(nomeProfessor);
                }).length;

                const totaisPorDia = sessoesFuturasLista.reduce((acc: number[], sessao: any) => {
                    const dataSessao = parseDashboardDataHora(sessao?.data, sessao?.horario);
                    if (Number.isNaN(dataSessao.getTime())) return acc;
                    const diaSemana = dataSessao.getDay();
                    acc[diaSemana] = (acc[diaSemana] ?? 0) + 1;
                    return acc;
                }, Array(7).fill(0));

                const maiorOcupacao = Math.max(...totaisPorDia, 0);
                const indiceMaiorOcupacao = totaisPorDia.findIndex((total) => total === maiorOcupacao);
                const diaMaiorOcupacaoCoaching =
                    maiorOcupacao > 0 && indiceMaiorOcupacao >= 0
                        ? DIAS_SEMANA[indiceMaiorOcupacao]
                        : 'Sem dados';

                const totalAlunos = sessoesFuturasLista.reduce(
                    (acc: number, sessao: any) => acc + (Array.isArray(sessao?.alunos) ? sessao.alunos.length : 0),
                    0,
                );
                const mediaAlunosPorSessao =
                    sessoesFuturasLista.length > 0 ? totalAlunos / sessoesFuturasLista.length : 0;

                setPropostasPendentesDashboard(Array.isArray(propostas) ? propostas : []);
                setDisponibilidadesPendentesDashboard(
                    disponibilidadesLista
                        ? disponibilidadesLista.filter((item: DisponibilidadeDashboard) => item.estado === 'Pendente')
                        : [],
                );
                setSessoesPorValidarDashboard(Array.isArray(sessoesPorValidar) ? sessoesPorValidar : []);
                setSessoesPendentesEstudioDashboard(
                    sessoesFuturasLista.filter((sessao: any) => !sessao?.idSala),
                );
                setEventosDashboard(Array.isArray(eventos) ? eventos : []);
                setDadosKpis((prev) => ({
                    ...prev,
                    professoresDisponibilidadeAtiva: professoresComDisponibilidadeAtiva,
                    professoresSemModalidades,
                    professoresSemSessoesMarcadas,
                    diaMaiorOcupacaoCoaching,
                    mediaAlunosPorSessao,
                }));
            } catch (error) {
                if (!ativo) return;
                console.error('Erro ao carregar resumo da coordenadora:', error);
                setPropostasPendentesDashboard([]);
                setDisponibilidadesPendentesDashboard([]);
                setSessoesPorValidarDashboard([]);
                setSessoesPendentesEstudioDashboard([]);
                setEventosDashboard([]);
                setDadosKpis((prev) => ({
                    ...prev,
                    professoresDisponibilidadeAtiva: 0,
                    professoresSemModalidades: 0,
                    professoresSemSessoesMarcadas: 0,
                    diaMaiorOcupacaoCoaching: 'Sem dados',
                    mediaAlunosPorSessao: 0,
                }));
            }
        }

        fetchCoordenadorResumo();

        return () => {
            ativo = false;
        };
    }, [isCoordenador]);

    async function alternarVisibilidadeAcao(id: number) {
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

    async function alternarVisibilidadeKpi(id: number) {
        const anterioresIds = [...kpisAtivosIds];
        const novosIds = kpisAtivosIds.includes(id) 
            ? kpisAtivosIds.filter(kId => kId !== id) 
            : [...kpisAtivosIds, id];

        setKpisAtivosIds(novosIds);
        localStorage.setItem(`kpis_visiveis_${userId}`, JSON.stringify(novosIds));

        try {
            if (!userId) return;
            await authService.updateQuadrosPreferences(userId, novosIds);
        } catch (error) {
            console.error('Erro ao gravar preferências de quadros:', error);
            setKpisAtivosIds(anterioresIds);
            localStorage.setItem(`kpis_visiveis_${userId}`, JSON.stringify(anterioresIds));
        }
    }

    const formatarEuros = (valor: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
    const formatarDataCurta = (valor: string) =>
        new Date(valor).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    const formatarHoraCurta = (valor: string) =>
        new Date(valor).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const paineisCoordenacao = useMemo(() => ([
        {
            titulo: 'Propostas de coaching',
            valor: propostasPendentesDashboard.length,
            descricao: 'Pedidos a aguardar aprovacao da coordenacao.',
            rota: '/admin/coaching',
            icone: 'fa-solid fa-clipboard-check',
            items: propostasPendentesDashboard.slice(0, 3).map((item) => ({
                id: `proposta-${item.idPedido}`,
                titulo: item.nomeProfessor || 'Professor',
                subtitulo: `${item.data} • ${item.horario}`,
                meta: item.nomeEncEducacao || item.modalidade || 'Pedido pendente',
            })),
        },
        {
            titulo: 'Disponibilidades por aprovar',
            valor: disponibilidadesPendentesDashboard.length,
            descricao: 'Novas disponibilidades pendentes de validacao.',
            rota: '/admin/professores-disponibilidade',
            icone: 'fa-solid fa-calendar-check',
            items: disponibilidadesPendentesDashboard.slice(0, 3).map((item) => ({
                id: `disp-${item.idDisponibilidade}`,
                titulo: item.nomeProfessor || 'Professor',
                subtitulo: `${item.data} • ${item.horario}`,
                meta: 'Disponibilidade pendente',
            })),
        },
        {
            titulo: 'Sessoes sem estudio',
            valor: sessoesPendentesEstudioDashboard.length,
            descricao: 'Marcacoes reais que aguardam atribuicao de estudio.',
            rota: '/admin/coaching',
            icone: 'fa-solid fa-building-circle-exclamation',
            items: sessoesPendentesEstudioDashboard.slice(0, 3).map((item) => ({
                id: `sessao-estudio-${item.idCoaching}`,
                titulo: item.modalidade || 'Sessao',
                subtitulo: `${item.data} â€¢ ${item.horario}`,
                meta: item.nomeProfessor || 'Professor',
            })),
        },
        {
            titulo: 'Sessoes por validar',
            valor: sessoesPorValidarDashboard.length,
            descricao: 'Sessoes com alunos que ainda aguardam validacao final.',
            rota: '/admin/coaching',
            icone: 'fa-solid fa-user-clock',
            items: sessoesPorValidarDashboard.slice(0, 3).map((item) => ({
                id: `sessao-${item.idCoaching}`,
                titulo: item.modalidade || 'Sessao',
                subtitulo: `${item.data} • ${item.horario}`,
                meta: item.nomeProfessor || 'Professor',
            })),
        },
    ]), [disponibilidadesPendentesDashboard, propostasPendentesDashboard, sessoesPendentesEstudioDashboard, sessoesPorValidarDashboard]);

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

    // O DICIONÁRIO AGORA RECEBE PROPRIEDADES DINÂMICAS PARA PODER INJETAR NO <article>
    const mapearQuadrosKpi: Record<string, (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode> = {
        'ocupacao': (props) => (
            <article {...props}>
                <div className="icone azul" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                    <i className="fa-solid fa-door-open"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Ocupação Estúdios (Hoje)
                        <i className="fa-solid fa-circle-info" title="Percentagem global de ocupação dos estúdios para o dia de hoje." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : `${dadosKpis.ocupacaoEstudios}%`}</h3>
                    </div>
                </div>
            </article>
        ),
        'faturacao_prev': (props) => (
            <article {...props}>
                <div className="icone roxo" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                    <i className="fa-solid fa-cash-register"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Faturação Prevista (Hoje)
                        <i className="fa-solid fa-circle-info" title="Valor estimado a receber no dia de hoje." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : formatarEuros(dadosKpis.faturacaoPrevistaDia)}</h3>
                    </div>
                </div>
            </article>
        ),
        'receita_mes': (props) => (
            <article {...props}>
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
        ),
        'em_atraso': (props) => (
            <article {...props}>
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
        ),
        'sessoes_prof': (props) => (
            <article {...props}>
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
        ),
        'aulas_hoje_prof': (props) => (
            <article {...props}>
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
        ),
        'pendentes_ee': (props) => (
            <article {...props}>
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
        ),
        'confirmar_ee': (props) => (
            <article {...props}>
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
        ),
        'marcadas_ee': (props) => (
            <article {...props}>
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
        ),
        'educandos_ee': (props) => (
            <article {...props}>
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
        ),
        'bailarinos': (props) => (
            <article {...props}>
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
        ),
        'aulas_geral': (props) => (
            <article {...props}>
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
        ),
        'prof_disp_ativa': (props) => (
            <article {...props}>
                <div className="icone verde" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    <i className="fa-solid fa-user-check"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Professores com disponibilidade ativa
                        <i className="fa-solid fa-circle-info" title="Numero de professores com pelo menos uma disponibilidade ativa registada." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.professoresDisponibilidadeAtiva}</h3>
                    </div>
                </div>
            </article>
        ),
        'prof_sem_modalidades': (props) => (
            <article {...props}>
                <div className="icone amarelo" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <i className="fa-solid fa-link-slash"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Professores sem modalidades
                        <i className="fa-solid fa-circle-info" title="Professores ainda sem modalidades associadas no perfil." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.professoresSemModalidades}</h3>
                    </div>
                </div>
            </article>
        ),
        'prof_sem_sessoes': (props) => (
            <article {...props}>
                <div className="icone vermelho" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <i className="fa-solid fa-calendar-xmark"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Professores sem sessoes marcadas
                        <i className="fa-solid fa-circle-info" title="Professores sem qualquer sessao futura de coaching agendada." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.professoresSemSessoesMarcadas}</h3>
                    </div>
                </div>
            </article>
        ),
        'dia_maior_ocupacao': (props) => (
            <article {...props}>
                <div className="icone azul" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                    <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Dia com maior ocupacao de coaching
                        <i className="fa-solid fa-circle-info" title="Dia da semana com mais sessoes futuras de coaching marcadas." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000', fontSize: '1.7rem' }}>{dadosKpis.isLoading ? '...' : dadosKpis.diaMaiorOcupacaoCoaching}</h3>
                    </div>
                </div>
            </article>
        ),
        'media_alunos_sessao': (props) => (
            <article {...props}>
                <div className="icone roxo" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                    <i className="fa-solid fa-users"></i>
                </div>
                <div className="info">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#000' }}>
                        Media de alunos por sessao
                        <i className="fa-solid fa-circle-info" title="Media de alunos inscritos por sessao futura de coaching." style={{ color: '#94a3b8', cursor: 'default', fontSize: '0.85rem' }}></i>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h3 style={{ color: '#000' }}>{dadosKpis.isLoading ? '...' : dadosKpis.mediaAlunosPorSessao.toFixed(1)}</h3>
                    </div>
                </div>
            </article>
        ),
    };

    // A mágica acontece aqui: decidimos se iteramos os permitidos todos (modo edição) ou só os visíveis (modo normal)
    const quadrosParaRenderizar = editandoKpis ? kpisPermitidosPorRole : kpisVisiveis;

    return (
        <main className="dashboard-wrapper">
            <section className="dashboard-topo">
                <div className="dashboard-boas-vindas">
                    <h1>Olá, {primeiroNome}!</h1>
                    <p>Resumo para hoje, {dataHoje}.</p>
                </div>

                <div className="acoes-rapidas-container">
                    <div className="acoes-rapidas-topo" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <ButtonComponent type="button" className={`btn-acao-mini editar ${editandoKpis ? 'ativo' : ''}`} onClick={() => setEditandoKpis(!editandoKpis)} title="Personalizar quadros">
                            <i className={`fa-solid ${editandoKpis ? 'fa-check' : 'fa-border-all'}`}></i>
                        </ButtonComponent>
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
                    </div>

                    {editandoAcoes && (
                        <div className="menu-edicao-acoes">
                            <h4>Personalizar ações</h4>
                            {acoesPermitidasPorRole.map((acao) => (
                                <div key={acao.id} className="item-edicao-mini">
                                    <span><i className={acao.icone}></i>{acao.nome}</span>
                                    <ButtonComponent type="button" onClick={() => alternarVisibilidadeAcao(acao.id)}>
                                        <i className={`fa-solid ${acoesAtivasIds.includes(acao.id) ? 'fa-toggle-on toggle-on' : 'fa-toggle-off toggle-off'}`}></i>
                                    </ButtonComponent>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {kpisPermitidosPorRole.length > 0 && (
                <>
                    <section className="kpi-grid">
                        {quadrosParaRenderizar.map(kpi => {
                            const isAtivo = kpisAtivosIds.includes(kpi.id);
                            
                            // Lógica de props injetada dinamicamente dependendo do modo de edição e de estar ativo
                            const cardProps = {
                                key: kpi.id,
                                className: 'kpi-card',
                                onClick: editandoKpis ? () => alternarVisibilidadeKpi(kpi.id) : (kpi.slug === 'pendentes_ee' ? () => navigate('/conta', { state: { abaAtiva: 'minhas_faturas' } }) : undefined),
                                style: editandoKpis ? {
                                    cursor: 'pointer',
                                    border: isAtivo ? '2px solid #22c55e' : '2px dashed #94a3b8',
                                    opacity: isAtivo ? 1 : 0.5,
                                    transform: isAtivo ? 'scale(1)' : 'scale(0.98)', // Pequeno encolhimento quando desativado
                                    boxShadow: isAtivo ? '0 4px 6px -1px rgba(34, 197, 94, 0.2)' : 'none',
                                    transition: 'all 0.2s ease-in-out'
                                } : (kpi.slug === 'pendentes_ee' ? { cursor: 'pointer' } : {})
                            };

                            return mapearQuadrosKpi[kpi.slug]?.(cardProps);
                        })}
                    </section>
                </>
            )}

            {isCoordenador && (
                <section className="dashboard-coordenacao">
                    <div className="coordenacao-grid">
                        {paineisCoordenacao.map((painel) => (
                            <article
                                key={painel.titulo}
                                className="coordenacao-card"
                                onClick={() => navigate(painel.rota)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(painel.rota);
                                    }
                                }}
                            >
                                <div className="coordenacao-card-header">
                                    <div className="coordenacao-card-icon">
                                        <i className={painel.icone}></i>
                                    </div>
                                    <div className="coordenacao-card-copy">
                                        <h3>{painel.titulo}</h3>
                                        <p>{painel.descricao}</p>
                                    </div>
                                    <strong className="coordenacao-card-value">{painel.valor}</strong>
                                </div>

                                <div className="coordenacao-card-list">
                                    {painel.items.length > 0 ? (
                                        painel.items.map((item) => (
                                            <div key={item.id} className="coordenacao-list-item">
                                                <strong>{item.titulo}</strong>
                                                <span>{item.subtitulo}</span>
                                                <small>{item.meta}</small>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="coordenacao-empty">Sem itens pendentes.</div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>

                    <article className="eventos-card-compacto">
                        <div className="eventos-card-header">
                            <div>
                                <h2>Próximos eventos</h2>
                                <p>Lista rápida para consulta e abertura direta.</p>
                            </div>
                            <ButtonComponent type="button" className="eventos-link-button" onClick={() => navigate('/admin/eventos')}>
                                Gestão de eventos
                            </ButtonComponent>
                        </div>

                        <div className="eventos-lista-compacta">
                            {eventosDashboard.length > 0 ? (
                                eventosDashboard.map((evento) => (
                                    <button
                                        key={evento.id}
                                        type="button"
                                        className="evento-linha"
                                        onClick={() => navigate(`/eventos/${evento.slug}`)}
                                    >
                                        <div className="evento-linha-data">
                                            <strong>{formatarDataCurta(evento.dataInicio)}</strong>
                                            <span>{formatarHoraCurta(evento.dataInicio)}</span>
                                        </div>
                                        <div className="evento-linha-copy">
                                            <strong>{evento.titulo}</strong>
                                            <span>{evento.local || 'Local a confirmar'}</span>
                                        </div>
                                        <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                ))
                            ) : (
                                <div className="coordenacao-empty">Sem eventos futuros publicados.</div>
                            )}
                        </div>
                    </article>
                </section>
            )}

            {!isCoordenador && (
                <div style={{ width: '100%', marginTop: '20px' }}>
                    <ResumoEventosDashboard />
                </div>
            )}

        </main>
    );
}

