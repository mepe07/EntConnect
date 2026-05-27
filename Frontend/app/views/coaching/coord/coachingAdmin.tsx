import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useMemo, useState } from 'react';
import { AuthService } from '~/services/auth.service';
import { AdminService } from '~/services/admin.service';
import './coachingAdmin.scss';
import { showToast } from '~/components/toast/toast';
import { coachingPropostasService } from '~/services/coachingPropostas.service';
import { SalasService } from '~/services/salas.service';
import { horariosService } from '~/services/horarios.service';

interface AlunoSessao {
    idAluno: number;
    nome: string;
}

interface EncarregadoInfo {
    nome: string;
    email: string | null;
    contacto: string | null;
}

interface AlunoDetalhes {
    idAluno: number;
    nome: string;
    dataNascimento: string | null;
    nif: string;
    email: string | null;
    contacto: string | null;
    menorIdade: boolean;
    encarregado: EncarregadoInfo | null;
}

interface SessaoAdmin {
    idCoaching: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    alunos: AlunoSessao[];
}

interface PropostaCoachingAdmin {
    idPedido: number;
    nomeEncEducacao: string;
    nomeProfessor: string;
    modalidade: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    estado: string;
    mensagemEE: string | null;
    mensagemProfessor: string | null;
    alunos: AlunoSessao[];
}

interface Estudio {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
}

interface ExcecaoAulaFixa {
    Data_Cancelada: string;
}

interface AulaFixa {
    ID_AulaFixa: number;
    Dia_Semana: number;
    Hora_Inicio: string;
    Duracao: number;
    ID_Estudio: number;
    Ativa: boolean;
    Dias_Semana?: {
        Nome_Dia: string;
    };
    Excecao_Aula_Fixa?: ExcecaoAulaFixa[];
}

type ViewMode = 'month' | 'week' | 'day';

interface KpiModalInfo {
    titulo: string;
    subtitulo: string;
    emptyText: string;
}

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDataHora(data: string, horario: string) {
    const [dia, mes, ano] = data.split('/').map(Number);
    const [horaInicio = '00:00'] = horario.split(' - ');
    const [hora, minuto] = horaInicio.split(':').map(Number);
    return new Date(ano, mes - 1, dia, hora || 0, minuto || 0);
}

function formatMonthLabel(date: Date) {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

const portugueseHolidays: Record<string, string> = {
    '01-01': 'Ano Novo',
    '25-04': 'Dia da Liberdade',
    '01-05': 'Dia do Trabalhador',
    '10-06': 'Dia de Portugal',
    '15-08': 'Assunção de Maria',
    '05-10': 'Implantação da República',
    '01-11': 'Todos os Santos',
    '01-12': 'Restauração da Independência',
    '08-12': 'Imaculada Conceição',
    '25-12': 'Natal',
};

function getEasterSunday(year: number) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getMovableHolidayName(date: Date) {
    const easter = getEasterSunday(date.getFullYear());
    const movableHolidays: Record<string, string> = {
        [`${pad(addDays(easter, -47).getDate())}-${pad(addDays(easter, -47).getMonth() + 1)}`]: 'Carnaval',
        [`${pad(addDays(easter, -2).getDate())}-${pad(addDays(easter, -2).getMonth() + 1)}`]: 'Sexta-feira Santa',
        [`${pad(easter.getDate())}-${pad(easter.getMonth() + 1)}`]: 'Páscoa',
        [`${pad(addDays(easter, 60).getDate())}-${pad(addDays(easter, 60).getMonth() + 1)}`]: 'Corpo de Cristo',
    };

    const key = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`;
    return movableHolidays[key] ?? null;
}

function getHolidayName(date: Date) {
    const key = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`;
    return portugueseHolidays[key] ?? getMovableHolidayName(date);
}

function isWeekend(date: Date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

const DIAS_SEMANA_PT: Record<number, string[]> = {
    0: ['domingo'],
    1: ['segunda', 'segunda-feira'],
    2: ['terca', 'terca-feira', 'terça', 'terça-feira'],
    3: ['quarta', 'quarta-feira'],
    4: ['quinta', 'quinta-feira'],
    5: ['sexta', 'sexta-feira'],
    6: ['sabado', 'sábado'],
};

function normalizarTexto(valor: string) {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function dataIsoDeValor(valor: string) {
    const isoMatch = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor.slice(0, 10);

    return formatDateKey(data);
}

function minutosDeHora(valor: string) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
        return data.getHours() * 60 + data.getMinutes();
    }

    const match = valor.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;

    return Number(match[1]) * 60 + Number(match[2]);
}

function intervalosSobrepostos(inicioA: number, fimA: number, inicioB: number, fimB: number) {
    return inicioA < fimB && inicioB < fimA;
}

function aulaFixaAconteceNoDia(aula: AulaFixa, dataProposta: Date) {
    const nomeDia = aula.Dias_Semana?.Nome_Dia;

    if (nomeDia) {
        const nomeNormalizado = normalizarTexto(nomeDia);
        return DIAS_SEMANA_PT[dataProposta.getDay()].some((dia) =>
            nomeNormalizado.includes(normalizarTexto(dia)),
        );
    }

    const diaSemanaPt = dataProposta.getDay() === 0 ? 7 : dataProposta.getDay();
    return aula.Dia_Semana === diaSemanaPt;
}

function aulaFixaTemExcecaoNestaData(aula: AulaFixa, dataProposta: Date) {
    const dataIso = formatDateKey(dataProposta);

    return aula.Excecao_Aula_Fixa?.some((excecao) => dataIsoDeValor(excecao.Data_Cancelada) === dataIso) ?? false;
}

function calcularEstudiosLivresProposta(proposta: PropostaCoachingAdmin | null, estudios: Estudio[], aulasFixas: AulaFixa[]) {
    if (!proposta) return estudios;

    const dataProposta = parseDataHora(proposta.data, proposta.horario);
    const [horaInicioStr, horaFimStr] = proposta.horario.split(' - ');
    const inicioProposta = minutosDeHora(horaInicioStr);
    const fimProposta = minutosDeHora(horaFimStr);

    const estudiosOcupados = new Set(
        aulasFixas
            .filter((aula) => aula.Ativa !== false)
            .filter((aula) => aulaFixaAconteceNoDia(aula, dataProposta))
            .filter((aula) => !aulaFixaTemExcecaoNestaData(aula, dataProposta))
            .filter((aula) => {
                const inicioAula = minutosDeHora(aula.Hora_Inicio);
                return intervalosSobrepostos(
                    inicioProposta,
                    fimProposta,
                    inicioAula,
                    inicioAula + aula.Duracao,
                );
            })
            .map((aula) => aula.ID_Estudio),
    );

    return estudios.filter((estudio) => !estudiosOcupados.has(estudio.ID_Sala));
}

function getWeekRange(date: Date) {
    const copy = new Date(date);
    const weekday = copy.getDay();
    const offset = (weekday + 6) % 7;
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() - offset);

    const end = new Date(copy);
    end.setDate(end.getDate() + 6);

    return { start: copy, end };
}

function getWeekDates(date: Date): Date[] {
    const { start } = getWeekRange(date);
    return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
}

function getMonthGrid(date: Date): Date[] {
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstOfMonth.getDay();
    const startOffset = (firstDayOfWeek + 6) % 7;

    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
}

function reorderMonthGridToStartWithWeek(monthGrid: Date[], referenceDate: Date) {
    if (monthGrid.length !== 42) return monthGrid;

    const chunkedWeeks: Date[][] = [];
    for (let i = 0; i < monthGrid.length; i += 7) {
        chunkedWeeks.push(monthGrid.slice(i, i + 7));
    }

    const targetKey = formatDateKey(referenceDate);
    const weekIndex = chunkedWeeks.findIndex((week) => week.some((day) => formatDateKey(day) === targetKey));
    if (weekIndex <= 0) return monthGrid;

    return [...chunkedWeeks.slice(weekIndex), ...chunkedWeeks.slice(0, weekIndex)].flat();
}

export default function CoachingAdmin() {
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();
    const adminService = new AdminService();
    const salasService = new SalasService();

    const [sessoes, setSessoes] = useState<SessaoAdmin[]>([]);
    const [sessoesPorValidar, setSessoesPorValidar] = useState<SessaoAdmin[]>([]);
    const [sessoesPorValidarCalendario, setSessoesPorValidarCalendario] = useState<SessaoAdmin[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [isValidacaoModalAberto, setIsValidacaoModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoAdmin | null>(null);
    const [isAlunoInfoModalAberto, setIsAlunoInfoModalAberto] = useState(false);
    const [alunoDetalhes, setAlunoDetalhes] = useState<AlunoDetalhes | null>(null);
    const [isCarregandoAluno, setIsCarregandoAluno] = useState(false);
    const [isExportando, setIsExportando] = useState(false); 

    const [isCarregandoPorValidar, setIsCarregandoPorValidar] = useState(false);
    const [propostasPendentes, setPropostasPendentes] = useState<PropostaCoachingAdmin[]>([]);
    const [isCarregandoPropostas, setIsCarregandoPropostas] = useState(false);
    const [propostaEmTratamento, setPropostaEmTratamento] = useState<number | null>(null);
    const [propostaSelecionada, setPropostaSelecionada] = useState<PropostaCoachingAdmin | null>(null);
    const [estudioPropostaSelecionado, setEstudioPropostaSelecionado] = useState('');
    const [listaEstudios, setListaEstudios] = useState<Estudio[]>([]);
    const [aulasFixas, setAulasFixas] = useState<AulaFixa[]>([]);
    const [kpiModalInfo, setKpiModalInfo] = useState<KpiModalInfo>({
        titulo: 'Sessões',
        subtitulo: 'Sessões referenciadas pelo indicador.',
        emptyText: 'Não existem sessões para apresentar.'
    });
    const [kpis, setKpis] = useState({
        proximas24h: 0,
        marcadas: 0,
        porValidar: 0,
        realizadasMes: 0
    });

    async function fetchDadosDashboard() {
        try {
            const [dadosKpis, dadosTabela] = await Promise.all([
                adminService.getKpis(),
                adminService.getSessoesFuturas()
            ]);

            setKpis(dadosKpis);
            setSessoes(Array.isArray(dadosTabela) ? dadosTabela : []);
            fetchPropostasPendentes();

            try {
                const dadosPorValidar = await adminService.getSessoesPorValidar();
                setSessoesPorValidarCalendario(Array.isArray(dadosPorValidar) ? dadosPorValidar : []);
            } catch (error) {
                console.error('Erro ao carregar sessões por validar no calendário:', error);
                setSessoesPorValidarCalendario([]);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setKpis({ proximas24h: 0, marcadas: 0, porValidar: 0, realizadasMes: 0 });
            setSessoes([]);
            setSessoesPorValidarCalendario([]);
        }
    }

    useEffect(() => {
        fetchDadosDashboard();
        fetchRecursosAprovacaoPropostas();
    }, []);

    const tableData = sessoes.map(sessao => ({
        ...sessao,
        numAlunos: sessao.alunos.length
    }));

    async function fetchPropostasPendentes() {
        setIsCarregandoPropostas(true);
        try {
            const dados = await coachingPropostasService.getPendentesAdmin();
            setPropostasPendentes(Array.isArray(dados) ? dados : []);
        } catch (error) {
            console.error(error);
            setPropostasPendentes([]);
        } finally {
            setIsCarregandoPropostas(false);
        }
    }

    async function fetchRecursosAprovacaoPropostas() {
        try {
            const [salas, horarios] = await Promise.all([
                salasService.getSalas(),
                horariosService.getHorarios(),
            ]);

            setListaEstudios(Array.isArray(salas) ? salas.filter((sala: Estudio) => sala.Disponivel === true) : []);
            setAulasFixas(Array.isArray(horarios) ? horarios : []);
        } catch (error) {
            console.error('Erro ao carregar estúdios para aprovação de propostas:', error);
            setListaEstudios([]);
            setAulasFixas([]);
        }
    }

    const sessoesOrdenadas = useMemo(() => {
        return sessoes
            .filter((sessao) => sessao.data && sessao.horario)
            .filter((sessao) => !Number.isNaN(parseDataHora(sessao.data, sessao.horario).getTime()))
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [sessoes]);

    const sessoesPorValidarOrdenadas = useMemo(() => {
        return sessoesPorValidarCalendario
            .filter((sessao) => sessao.data && sessao.horario)
            .filter((sessao) => !Number.isNaN(parseDataHora(sessao.data, sessao.horario).getTime()))
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [sessoesPorValidarCalendario]);

    const sessoesCalendario = useMemo(() => {
        const map = new Map<number, SessaoAdmin>();

        [...sessoesOrdenadas, ...sessoesPorValidarOrdenadas].forEach((sessao) => {
            map.set(sessao.idCoaching, sessao);
        });

        return Array.from(map.values())
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [sessoesOrdenadas, sessoesPorValidarOrdenadas]);

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, SessaoAdmin[]>();

        sessoesCalendario.forEach((sessao) => {
            const key = formatDateKey(parseDataHora(sessao.data, sessao.horario));
            const entry = map.get(key) ?? [];
            entry.push(sessao);
            map.set(key, entry);
        });

        map.forEach((items) => {
            items.sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
        });

        return map;
    }, [sessoesCalendario]);

    const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
    const weekGrid = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
    const displayedMonthGrid = useMemo(() => {
        const hoje = new Date();
        const isCurrentMonth =
            selectedDate.getFullYear() === hoje.getFullYear() &&
            selectedDate.getMonth() === hoje.getMonth();

        return isCurrentMonth ? reorderMonthGridToStartWithWeek(monthGrid, hoje) : monthGrid;
    }, [monthGrid, selectedDate]);
    const selectedHolidayName = getHolidayName(selectedDate);

    const activeRangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const range = getWeekRange(selectedDate);
            return `${range.start.toLocaleDateString('pt-PT')} - ${range.end.toLocaleDateString('pt-PT')}`;
        }

        if (viewMode === 'day') {
            const label = selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return selectedHolidayName ? `${label} - ${selectedHolidayName}` : label;
        }

        return formatMonthLabel(selectedDate);
    }, [selectedDate, selectedHolidayName, viewMode]);

    function abrirModal(sessao: SessaoAdmin) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }

    function abrirModalKpi(info: KpiModalInfo, dados: SessaoAdmin[]) {
        setKpiModalInfo(info);
        setSessoesPorValidar(dados);
        setIsValidacaoModalAberto(true);
        setIsCarregandoPorValidar(false);
    }

    function abrirModalProximas24h() {
        const agora = new Date();
        const daqui24h = new Date(agora);
        daqui24h.setHours(daqui24h.getHours() + 24);

        const dados = sessoesOrdenadas.filter((sessao) => {
            const dataSessao = parseDataHora(sessao.data, sessao.horario);
            return dataSessao >= agora && dataSessao <= daqui24h;
        });

        abrirModalKpi(
            {
                titulo: 'Próximas 24h',
                subtitulo: 'Sessões marcadas para as próximas 24 horas.',
                emptyText: 'Não existem sessões nas próximas 24 horas.'
            },
            dados
        );
    }

    function abrirModalSessoesMarcadas() {
        abrirModalKpi(
            {
                titulo: 'Sessões Marcadas',
                subtitulo: 'Todas as sessões futuras atualmente marcadas.',
                emptyText: 'Não existem sessões marcadas.'
            },
            sessoesOrdenadas
        );
    }

    async function abrirModalPorValidar() {
        setKpiModalInfo({
            titulo: 'Terminadas por validar',
            subtitulo: 'Sessões passadas que ainda estão pendentes.',
            emptyText: 'Não existem sessões por validar.'
        });
        setIsValidacaoModalAberto(true);
        setIsCarregandoPorValidar(true);

        try {
            const dados = await adminService.getSessoesPorValidar();
            const lista = Array.isArray(dados) ? dados : [];
            setSessoesPorValidar(lista);
            setSessoesPorValidarCalendario(lista);
        } catch (error) {
            console.error(error);
            setSessoesPorValidar([]);
            showToast(error instanceof Error ? error.message : 'Erro ao carregar sessões por validar.');
        } finally {
            setIsCarregandoPorValidar(false);
        }
    }

    async function abrirModalRealizadasMes() {
        setKpiModalInfo({
            titulo: 'Realizadas (Mês)',
            subtitulo: 'Sessões realizadas durante o mês atual.',
            emptyText: 'Não existem sessões realizadas neste mês.'
        });
        setIsValidacaoModalAberto(true);
        setIsCarregandoPorValidar(true);

        try {
            const dados = await adminService.getSessoesRealizadasMes();
            setSessoesPorValidar(Array.isArray(dados) ? dados : []);
        } catch (error) {
            console.error(error);
            setSessoesPorValidar([]);
            showToast(error instanceof Error ? error.message : 'Erro ao carregar sessões realizadas no mês.');
        } finally {
            setIsCarregandoPorValidar(false);
        }
    }

    function fecharModalPorValidar() {
        setIsValidacaoModalAberto(false);
    }

    function abrirDetalhesPorValidar(sessao: SessaoAdmin) {
        setIsValidacaoModalAberto(false);
        abrirModal(sessao);
    }

    async function handleEliminarSessao() {
        if (!sessaoSelecionada) return;

        if (!isSessaoFutura(sessaoSelecionada)) {
            showToast('Apenas sessões futuras podem ser anuladas.');
            return;
        }

        for (const aluno of sessaoSelecionada.alunos) {
            await adminService.removerAluno(aluno.idAluno, sessaoSelecionada.idCoaching);
        }

        setSessoesPorValidar((atuais) => atuais.filter((sessao) => sessao.idCoaching !== sessaoSelecionada.idCoaching));
        setSessoesPorValidarCalendario((atuais) => atuais.filter((sessao) => sessao.idCoaching !== sessaoSelecionada.idCoaching));
        fecharModal();
        fetchDadosDashboard();
    }

    async function handleRemoverAluno(idAluno: number) {
        if (!sessaoSelecionada) return;

        if (window.confirm('Tem a certeza que deseja remover este aluno da sessão?')) {
            try {
                await adminService.removerAluno(idAluno, sessaoSelecionada.idCoaching);

                if (sessaoSelecionada.alunos.length === 1) {
                    showToast('Aluno removido. A sessão ficou sem alunos e foi apagada do sistema.');
                    setSessoesPorValidar((atuais) => atuais.filter((sessao) => sessao.idCoaching !== sessaoSelecionada.idCoaching));
                    setSessoesPorValidarCalendario((atuais) => atuais.filter((sessao) => sessao.idCoaching !== sessaoSelecionada.idCoaching));
                    fecharModal();
                    fetchDadosDashboard();
                } else {
                    showToast('Aluno removido com sucesso.');
                    const novaListaAlunos = sessaoSelecionada.alunos.filter((aluno) => aluno.idAluno !== idAluno);
                    setSessaoSelecionada({ ...sessaoSelecionada, alunos: novaListaAlunos });

                    setSessoesPorValidar((atuais) =>
                        atuais.map((sessao) =>
                            sessao.idCoaching === sessaoSelecionada.idCoaching
                                ? { ...sessao, alunos: novaListaAlunos }
                                : sessao
                        )
                    );
                    setSessoesPorValidarCalendario((atuais) =>
                        atuais.map((sessao) =>
                            sessao.idCoaching === sessaoSelecionada.idCoaching
                                ? { ...sessao, alunos: novaListaAlunos }
                                : sessao
                        )
                    );
                    fetchDadosDashboard();
                }
            } catch (error) {
                showToast('Erro ao remover aluno.');
            }
        }
    }

    function abrirModalAprovacaoProposta(proposta: PropostaCoachingAdmin) {
        setPropostaSelecionada(proposta);
        setEstudioPropostaSelecionado('');
    }

    function fecharModalAprovacaoProposta() {
        setPropostaSelecionada(null);
        setEstudioPropostaSelecionado('');
    }

    async function confirmarAprovacaoProposta() {
        if (!propostaSelecionada) return;

        if (!estudioPropostaSelecionado) {
            showToast('Selecione um estúdio para aprovar a proposta.');
            return;
        }

        await handleAprovarProposta(propostaSelecionada, Number(estudioPropostaSelecionado));
    }

    async function handleAprovarProposta(proposta: PropostaCoachingAdmin, idEstudio: number) {
        setPropostaEmTratamento(proposta.idPedido);
        try {
            await coachingPropostasService.aprovar(proposta.idPedido, idEstudio);
            showToast('Proposta aprovada e sessão criada.');
            setPropostasPendentes((atuais) => atuais.filter((item) => item.idPedido !== proposta.idPedido));
            fecharModalAprovacaoProposta();
            fetchDadosDashboard();
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : 'Erro ao aprovar proposta.');
        } finally {
            setPropostaEmTratamento(null);
        }
    }

    async function handleRejeitarProposta(proposta: PropostaCoachingAdmin) {
        if (!window.confirm('Rejeitar esta proposta de coaching?')) return;

        setPropostaEmTratamento(proposta.idPedido);
        try {
            await coachingPropostasService.rejeitar(proposta.idPedido);
            showToast('Proposta rejeitada.');
            setPropostasPendentes((atuais) => atuais.filter((item) => item.idPedido !== proposta.idPedido));
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : 'Erro ao rejeitar proposta.');
        } finally {
            setPropostaEmTratamento(null);
        }
    }

    async function abrirModalAluno(aluno: AlunoSessao) {
        setIsCarregandoAluno(true);

        try {
            const detalhes = await adminService.getAlunoDetalhes(aluno.idAluno);
            setAlunoDetalhes(detalhes);
            setIsAlunoInfoModalAberto(true);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar detalhes do aluno.');
        } finally {
            setIsCarregandoAluno(false);
        }
    }

    function fecharModalAluno() {
        setIsAlunoInfoModalAberto(false);
        setAlunoDetalhes(null);
    }

    async function handleExportarExcel(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        setIsExportando(true);
        try {
            showToast('A gerar ficheiro Excel...');
            const blob = await adminService.exportarSessoesExcel();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sessoes_validadas_${new Date().toISOString().slice(0,7)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            showToast('Excel exportado com sucesso!');
        } catch (error) {
            console.error(error);
            showToast('Erro ao exportar ficheiro.');
        } finally {
            setIsExportando(false);
        }
    }

    function changeDate(amount: number) {
        const nextDate = new Date(selectedDate);

        if (viewMode === 'month') {
            nextDate.setMonth(nextDate.getMonth() + amount);
        } else if (viewMode === 'week') {
            nextDate.setDate(nextDate.getDate() + amount * 7);
        } else {
            nextDate.setDate(nextDate.getDate() + amount);
        }

        setSelectedDate(nextDate);
    }

    function isSessaoPorValidar(sessao: SessaoAdmin) {
        const dataSessao = parseDataHora(sessao.data, sessao.horario);
        return String(sessao.estado ?? '').trim().toLowerCase() === 'pendente' && dataSessao < new Date();
    }

    function isSessaoFutura(sessao: SessaoAdmin) {
        return parseDataHora(sessao.data, sessao.horario) > new Date();
    }

    const renderSessaoCard = (sessao: SessaoAdmin, small = false) => (
        <button
            key={sessao.idCoaching}
            type="button"
            className={`calendar-item coaching-admin-item ${small ? 'calendar-item-small' : ''} ${isSessaoPorValidar(sessao) ? 'calendar-item-warning' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                abrirModal(sessao);
            }}
        >
            <span className="item-badge">{isSessaoPorValidar(sessao) ? '!' : 'C'}</span>
            <span className="item-copy">
                <strong>{sessao.modalidade || 'Coaching'}</strong>
                <span>Prof. {sessao.nomeProfessor || 'Não definido'}</span>
                <span>{sessao.horario}</span>
                <span>{isSessaoPorValidar(sessao) ? 'Por validar' : `${sessao.alunos.length} aluno${sessao.alunos.length === 1 ? '' : 's'}`}</span>
            </span>
        </button>
    );

    const estudiosLivresProposta = calcularEstudiosLivresProposta(propostaSelecionada, listaEstudios, aulasFixas);

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-boas-vindas">
                <div>
                    <h1>Gestão de Coaching</h1>
                    <p>Controle todas as sessões e inscrições ativas.</p>
                </div>
                
                <ButtonComponent 
                    onClick={(e) => handleExportarExcel(e)}
                    disabled={isExportando}
                    style={{ 
                        backgroundColor: '#2c4c3b', // Verde do cabeçalho
                        color: 'white', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: isExportando ? 'not-allowed' : 'pointer',
                        opacity: isExportando ? 0.7 : 1
                    }}
                >
                    <i className="fa-solid fa-file-excel"></i> 
                    {isExportando ? 'A Exportar...' : 'Exportar Excel'}
                </ButtonComponent>
            </div>

            <section className="kpi-grid">
                <button type="button" className="kpi-card kpi-card-button" onClick={abrirModalProximas24h}>
                    <div className="icone azul"><i className="fa-solid fa-clock-rotate-left"></i></div>
                    <div className="info">
                        <span>Próximas 24h</span>
                        <h3>{kpis.proximas24h}</h3>
                    </div>
                </button>
                <button type="button" className="kpi-card kpi-card-button" onClick={abrirModalSessoesMarcadas}>
                    <div className="icone verde"><i className="fa-solid fa-calendar-check"></i></div>
                    <div className="info">
                        <span>Sessões Marcadas</span>
                        <h3>{kpis.marcadas}</h3>
                    </div>
                </button>
                <button type="button" className="kpi-card kpi-card-button" onClick={abrirModalPorValidar}>
                    <div className="icone amarelo">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div className="info">
                        <span>Terminadas por validar</span>
                        <h3>{kpis.porValidar}</h3>
                    </div>
                </button>
                <button type="button" className="kpi-card kpi-card-button" onClick={abrirModalRealizadasMes}>
                    <div className="icone roxo"><i className="fa-solid fa-clipboard-check"></i></div>
                    <div className="info">
                        <span>Realizadas (Mês)</span>
                        <h3>{kpis.realizadasMes}</h3>
                    </div>
                </button>
            </section>

            <section className="propostas-section">
                <div className="propostas-header">
                    <div>
                        <h2>Propostas por aprovar</h2>
                        <p>{propostasPendentes.length} pedido{propostasPendentes.length === 1 ? '' : 's'} pendente{propostasPendentes.length === 1 ? '' : 's'}</p>
                    </div>
                    <ButtonComponent type="button" className="tool-button" onClick={fetchPropostasPendentes} disabled={isCarregandoPropostas}>
                        <i className="fa-solid fa-rotate"></i> Atualizar
                    </ButtonComponent>
                </div>

                {isCarregandoPropostas ? (
                    <div className="empty-state">A carregar propostas...</div>
                ) : propostasPendentes.length === 0 ? (
                    <div className="empty-state">Não existem propostas pendentes.</div>
                ) : (
                    <div className="propostas-list">
                        {propostasPendentes.map((proposta) => (
                            <article key={proposta.idPedido} className="proposta-card">
                                <div className="proposta-main">
                                    <span className="proposta-date">{proposta.data} | {proposta.horario}</span>
                                    <h3>{proposta.modalidade}</h3>
                                    <p>Prof. {proposta.nomeProfessor} com {proposta.alunos.map((aluno) => aluno.nome).join(', ')}</p>
                                    <span>Enc. educação: {proposta.nomeEncEducacao}</span>
                                    {(proposta.mensagemEE || proposta.mensagemProfessor) && (
                                        <small>{proposta.mensagemEE || proposta.mensagemProfessor}</small>
                                    )}
                                </div>
                                <div className="proposta-actions">
                                    <ButtonComponent
                                        type="button"
                                        className="btn-aprovar-proposta"
                                        onClick={() => abrirModalAprovacaoProposta(proposta)}
                                        disabled={propostaEmTratamento === proposta.idPedido}
                                    >
                                        <i className="fa-solid fa-check"></i> Aprovar
                                    </ButtonComponent>
                                    <ButtonComponent
                                        type="button"
                                        className="btn-rejeitar-proposta"
                                        onClick={() => handleRejeitarProposta(proposta)}
                                        disabled={propostaEmTratamento === proposta.idPedido}
                                    >
                                        <i className="fa-solid fa-xmark"></i> Rejeitar
                                    </ButtonComponent>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {propostaSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo modal-conteudo-proposta">
                        <div className="modal-cabecalho">
                            <div>
                                <h2>Aprovar proposta</h2>
                                <p className="modal-subtitle">Selecione o estúdio para criar a sessão.</p>
                            </div>
                            <ButtonComponent type="button" className="btn-fechar-icon" onClick={fecharModalAprovacaoProposta}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="proposta-aprovacao-info">
                            <div>
                                <span>Data</span>
                                <strong>{propostaSelecionada.data} | {propostaSelecionada.horario}</strong>
                            </div>
                            <div>
                                <span>Modalidade</span>
                                <strong>{propostaSelecionada.modalidade}</strong>
                            </div>
                            <div>
                                <span>Professor</span>
                                <strong>{propostaSelecionada.nomeProfessor}</strong>
                            </div>
                            <div>
                                <span>Alunos</span>
                                <strong>{propostaSelecionada.alunos.map((aluno) => aluno.nome).join(', ')}</strong>
                            </div>
                        </div>

                        <label className="proposta-estudio-field">
                            Estúdio
                            <select
                                className="select-box"
                                value={estudioPropostaSelecionado}
                                onChange={(event) => setEstudioPropostaSelecionado(event.target.value)}
                            >
                                <option value="">Selecione um estúdio...</option>
                                {estudiosLivresProposta.map((estudio) => (
                                    <option key={estudio.ID_Sala} value={estudio.ID_Sala}>
                                        {estudio.Nome}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {estudiosLivresProposta.length === 0 && (
                            <p className="proposta-estudio-alerta">
                                Nenhum estúdio livre para este dia e horário.
                            </p>
                        )}

                        <div className="modal-acoes">
                            <ButtonComponent type="button" className="btn-fechar" onClick={fecharModalAprovacaoProposta}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                type="button"
                                className="btn-confirmar-proposta"
                                onClick={confirmarAprovacaoProposta}
                                disabled={!estudioPropostaSelecionado || estudiosLivresProposta.length === 0 || propostaEmTratamento === propostaSelecionada.idPedido}
                            >
                                Confirmar aprovação
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            <section className="coaching-calendar-section">
                <div className="calendario-header">
                    <div>
                        <h2>Calendário de sessões</h2>
                        <p className="calendario-range">{activeRangeLabel}</p>
                    </div>

                    <div className="calendario-actions">
                        <div className="calendario-buttons">
                            <ButtonComponent type="button" className="tool-button" onClick={() => changeDate(-1)} aria-label="Anterior">
                                <i className="fa-solid fa-arrow-left" />
                            </ButtonComponent>
                            <ButtonComponent type="button" className="tool-button" onClick={() => setSelectedDate(new Date())}>
                                Hoje
                            </ButtonComponent>
                            <ButtonComponent type="button" className="tool-button" onClick={() => changeDate(1)} aria-label="Próximo">
                                <i className="fa-solid fa-arrow-right" />
                            </ButtonComponent>
                        </div>

                        <div className="view-mode-buttons">
                            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                                <ButtonComponent
                                    key={mode}
                                    type="button"
                                    className={`view-button ${viewMode === mode ? 'active' : ''}`}
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode === 'month' ? 'Mensal' : mode === 'week' ? 'Semanal' : 'Diário'}
                                </ButtonComponent>
                            ))}
                        </div>
                    </div>
                </div>

                {viewMode === 'day' ? (
                    <div className="calendario-list">
                        <div className="day-summary">
                            <div>
                                <span className="day-summary-label">Dia selecionado</span>
                                <strong>{selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                            </div>
                            {selectedHolidayName && <span className="day-holiday">Feriado: {selectedHolidayName}</span>}
                        </div>
                        <div className="day-items">
                            {(() => {
                                const items = dayItemsMap.get(formatDateKey(selectedDate)) ?? [];

                                if (items.length === 0) {
                                    return <div className="empty-state">Não há sessões neste dia.</div>;
                                }

                                return items.map((sessao) => renderSessaoCard(sessao));
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="calendario-grid">
                        <div className="calendar-weekday">Seg</div>
                        <div className="calendar-weekday">Ter</div>
                        <div className="calendar-weekday">Qua</div>
                        <div className="calendar-weekday">Qui</div>
                        <div className="calendar-weekday">Sex</div>
                        <div className="calendar-weekday">Sáb</div>
                        <div className="calendar-weekday">Dom</div>

                        {(viewMode === 'week' ? weekGrid : displayedMonthGrid).map((day) => {
                            const dayKey = formatDateKey(day);
                            const dayItems = dayItemsMap.get(dayKey) ?? [];
                            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                            const isToday = dayKey === formatDateKey(new Date());
                            const holidayName = getHolidayName(day);
                            const weekend = isWeekend(day);
                            const previewItems = dayItems.slice(0, 2);
                            const extraItems = dayItems.length - previewItems.length;

                            return (
                                <div
                                    key={dayKey}
                                    role="button"
                                    tabIndex={0}
                                    className={`calendar-day ${viewMode === 'month' && !isCurrentMonth ? 'calendar-day--muted' : ''} ${isToday ? 'calendar-day--today' : ''} ${weekend ? 'calendar-day--weekend' : ''} ${holidayName ? 'calendar-day--holiday' : ''}`}
                                    onClick={() => {
                                        setSelectedDate(day);
                                        setViewMode('day');
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setSelectedDate(day);
                                            setViewMode('day');
                                        }
                                    }}
                                >
                                    <div className="calendar-day-header">
                                        <span>{day.getDate()}</span>
                                        {holidayName && <span className="calendar-day-holiday">{holidayName}</span>}
                                    </div>
                                    <div className="calendar-day-items">
                                        {previewItems.map((sessao) => renderSessaoCard(sessao, true))}
                                        {extraItems > 0 && (
                                            <span className="calendar-more">
                                                +{extraItems} registo{extraItems > 1 ? 's' : ''} escondido{extraItems > 1 ? 's' : ''}
                                                <small>Clique no dia para ver todos</small>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {isValidacaoModalAberto && (
                <div className="modal-overlay" onClick={fecharModalPorValidar}>
                    <div className="modal-conteudo modal-conteudo-validacao" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <div>
                                <h2>{kpiModalInfo.titulo}</h2>
                                <p className="modal-subtitle">{kpiModalInfo.subtitulo}</p>
                            </div>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModalPorValidar} aria-label="Fechar">
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        {isCarregandoPorValidar ? (
                            <div className="empty-state">A carregar sessões...</div>
                        ) : sessoesPorValidar.length === 0 ? (
                            <div className="empty-state">{kpiModalInfo.emptyText}</div>
                        ) : (
                            <div className="validacao-list">
                                {sessoesPorValidar.map((sessao) => (
                                    <button
                                        key={sessao.idCoaching}
                                        type="button"
                                        className="validacao-card"
                                        onClick={() => abrirDetalhesPorValidar(sessao)}
                                    >
                                        <span className="validacao-date">{sessao.data}</span>
                                        <span className="validacao-main">
                                            <strong>{sessao.modalidade || 'Coaching'}</strong>
                                            <span>{sessao.horario}</span>
                                        </span>
                                        <span className="validacao-meta">
                                            <span>Prof. {sessao.nomeProfessor || 'Não definido'}</span>
                                            <span>{sessao.alunos.length} aluno{sessao.alunos.length === 1 ? '' : 's'}</span>
                                        </span>
                                        <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModal} aria-label="Fechar">
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Professor</span><strong>{sessaoSelecionada.nomeProfessor}</strong></div>
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{sessaoSelecionada.data} | {sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        <h3>Alunos Inscritos ({sessaoSelecionada.alunos.length})</h3>
                        <div className="lista-alunos-modal">
                            {sessaoSelecionada.alunos.map((aluno) => (
                                <div key={aluno.idAluno} className="aluno-modal-row">
                                    <span>{aluno.nome}</span>
                                    <div className="aluno-modal-actions">
                                        <ButtonComponent
                                            className="btn-info-aluno"
                                            onClick={() => abrirModalAluno(aluno)}
                                            disabled={isCarregandoAluno}
                                        >
                                            <i className="fa-solid fa-info-circle"></i> Ver Info
                                        </ButtonComponent>
                                        <ButtonComponent
                                            className="btn-remover-aluno"
                                            onClick={() => handleRemoverAluno(aluno.idAluno)}
                                        >
                                            <i className="fa-solid fa-trash-can"></i> Remover
                                        </ButtonComponent>
                                    </div>
                                </div>
                            ))}
                            {sessaoSelecionada.alunos.length === 0 && (
                                <p className="empty-modal-list">Sem alunos inscritos.</p>
                            )}
                        </div>

                        <div className="modal-acoes">
                            {isSessaoFutura(sessaoSelecionada) && (
                                <ButtonComponent className="btn-anularSessao" onClick={handleEliminarSessao}>Anular sessão</ButtonComponent>
                            )}
                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>Fechar</ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {isAlunoInfoModalAberto && alunoDetalhes && (
                <div className="modal-overlay modal-overlay-aluno" onClick={fecharModalAluno}>
                    <div className="modal-conteudo modal-conteudo-aluno" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Informação do Aluno</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModalAluno} aria-label="Fechar">
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Nome</span><strong>{alunoDetalhes.nome}</strong></div>
                            <div className="detalhe-item"><span>Data de Nascimento</span><strong>{alunoDetalhes.dataNascimento || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>NIF</span><strong>{alunoDetalhes.nif}</strong></div>
                            <div className="detalhe-item"><span>Email</span><strong>{alunoDetalhes.email || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Contacto</span><strong>{alunoDetalhes.contacto || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Menor de idade</span><strong>{alunoDetalhes.menorIdade ? 'Sim' : 'Não'}</strong></div>
                        </div>

                        <h3>Encarregado de Educação</h3>
                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Nome</span><strong>{alunoDetalhes.encarregado?.nome || 'Sem encarregado'}</strong></div>
                            <div className="detalhe-item"><span>Email</span><strong>{alunoDetalhes.encarregado?.email || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Contacto</span><strong>{alunoDetalhes.encarregado?.contacto || 'N/A'}</strong></div>
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-fechar" onClick={fecharModalAluno}>Fechar</ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
