import { ButtonComponent } from '~/components/button/button.component';
import './verAgendamentos.scss';
import type { User } from '~/models/interfaces/user.interface';
import { authService } from '~/services/auth.service';
import { AgendamentosService } from '~/services/agendamentos.service';
import { useEffect, useMemo, useState } from 'react';
import { RolesService } from '~/services/roles.service';
import { AdminService } from '~/services/admin.service';
import { showToast } from '~/components/toast/toast';

type ViewMode = 'month' | 'week' | 'day';

interface AgendamentoProfessor {
    idCoaching: number;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    alunos?: Array<{
        idAluno: number;
        nome: string;
    }>;
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

export default function VerAgendamentos() {
    const userInfo = authService.getUserInfo() as User;
    const isProfessor = userInfo?.role.toLowerCase().includes('professor');
    const agendamentosService = new AgendamentosService();
    const rolesService = new RolesService();
    const adminService = new AdminService();

    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [agendamentos, setAgendamentos] = useState<AgendamentoProfessor[]>([]);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<AgendamentoProfessor | null>(null);
    const [isAlunoInfoModalAberto, setIsAlunoInfoModalAberto] = useState(false);
    const [alunoDetalhes, setAlunoDetalhes] = useState<any | null>(null);
    const [isCarregandoAluno, setIsCarregandoAluno] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchAgendamentos() {
        setIsLoading(true);
        setError(null);

        try {
            if (!userInfo || !userInfo.sub) {
                setError('Utilizador não encontrado.');
                return;
            }

            const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo.sub);
            const idProfessor = respostaRoles?.idProfessor;

            if (!idProfessor) {
                setAgendamentos([]);
                return;
            }

            const data = await agendamentosService.getAgendamentosProfessor(idProfessor);
            setAgendamentos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Sem agendamentos:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (isProfessor) {
            fetchAgendamentos();
        }
    }, [isProfessor]);

    const agendamentosOrdenados = useMemo(() => {
        return agendamentos
            .filter((agendamento) => agendamento.data && agendamento.horario)
            .filter((agendamento) => !Number.isNaN(parseDataHora(agendamento.data, agendamento.horario).getTime()))
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [agendamentos]);

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, AgendamentoProfessor[]>();

        agendamentosOrdenados.forEach((agendamento) => {
            const key = formatDateKey(parseDataHora(agendamento.data, agendamento.horario));
            const entry = map.get(key) ?? [];
            entry.push(agendamento);
            map.set(key, entry);
        });

        map.forEach((items) => {
            items.sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
        });

        return map;
    }, [agendamentosOrdenados]);

    const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
    const weekGrid = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
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

    if (!isProfessor) {
        return (
            <div className="pagina-agendamentos pagina-agendamentos-acesso">
                <h1>Acesso Negado</h1>
            </div>
        );
    }

    function abrirModal(sessao: AgendamentoProfessor) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }

    async function abrirModalAluno(aluno: any) {
        setIsCarregandoAluno(true);

        try {
            const detalhes = await adminService.getAlunoDetalhes(aluno.idAluno);
            setAlunoDetalhes(detalhes);
            setIsAlunoInfoModalAberto(true);
        } catch (err) {
            console.error(err);
            showToast('Erro ao carregar detalhes do aluno. Verifica se tens permissão.');
        } finally {
            setIsCarregandoAluno(false);
        }
    }

    function fecharModalAluno() {
        setIsAlunoInfoModalAberto(false);
        setAlunoDetalhes(null);
    }

    async function handleEliminarSessao() {
        if (!sessaoSelecionada) return;

        for (const aluno of sessaoSelecionada.alunos ?? []) {
            await adminService.removerAluno(aluno.idAluno, sessaoSelecionada.idCoaching);
        }

        fecharModal();
        fetchAgendamentos();
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

    const renderAgendamentoCard = (agendamento: AgendamentoProfessor, small = false) => (
        <button
            key={agendamento.idCoaching}
            type="button"
            className={`calendar-item agendamento-item ${small ? 'calendar-item-small' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                abrirModal(agendamento);
            }}
        >
            <span className="item-badge">A</span>
            <span className="item-copy">
                <strong>{agendamento.modalidade || 'Coaching'}</strong>
                <span>{agendamento.horario}</span>
                <span>{agendamento.estado || 'Sem estado'}</span>
                <span>{agendamento.alunos?.length ?? 0} aluno{(agendamento.alunos?.length ?? 0) === 1 ? '' : 's'}</span>
            </span>
        </button>
    );

    return (
        <div className="pagina-ver-agendamentos">
            <div className="calendario-header">
                <div>
                    <h1>Os meus agendamentos</h1>
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

            {isLoading && <div className="calendario-status">A carregar agendamentos...</div>}
            {error && <div className="calendario-error">{error}</div>}

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
                                return <div className="empty-state">Não há agendamentos neste dia.</div>;
                            }

                            return items.map((agendamento) => renderAgendamentoCard(agendamento));
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

                    {(viewMode === 'week' ? weekGrid : monthGrid).map((day) => {
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
                                    {previewItems.map((agendamento) => renderAgendamentoCard(agendamento, true))}
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

            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Detalhes do Agendamento</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModal} aria-label="Fechar">
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{sessaoSelecionada.data} | {sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        <h3>Alunos Inscritos ({sessaoSelecionada.alunos?.length ?? 0})</h3>
                        <div className="lista-alunos-modal">
                            {(sessaoSelecionada.alunos ?? []).map((aluno, index) => (
                                <div key={aluno.idAluno || index} className="aluno-modal-row">
                                    <div className="aluno-modal-info">
                                        <i className="fa-solid fa-user"></i>
                                        <span>{aluno.nome}</span>
                                    </div>

                                    <ButtonComponent
                                        className="btn-info-aluno"
                                        onClick={() => abrirModalAluno(aluno)}
                                        disabled={isCarregandoAluno}
                                    >
                                        <i className="fa-solid fa-info-circle"></i>
                                        {isCarregandoAluno ? 'A carregar...' : 'Ver Info'}
                                    </ButtonComponent>
                                </div>
                            ))}
                            {(sessaoSelecionada.alunos?.length ?? 0) === 0 && (
                                <p className="empty-modal-list">Sem alunos inscritos.</p>
                            )}
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-anularSessao" onClick={handleEliminarSessao}>Anular sessão</ButtonComponent>
                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </ButtonComponent>
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

                        {alunoDetalhes.encarregado && (
                            <>
                                <h3>Encarregado de Educação</h3>
                                <div className="detalhes-grid">
                                    <div className="detalhe-item"><span>Nome</span><strong>{alunoDetalhes.encarregado.nome || 'Sem encarregado'}</strong></div>
                                    <div className="detalhe-item"><span>Email</span><strong>{alunoDetalhes.encarregado.email || 'N/A'}</strong></div>
                                    <div className="detalhe-item"><span>Contacto</span><strong>{alunoDetalhes.encarregado.contacto || 'N/A'}</strong></div>
                                </div>
                            </>
                        )}

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-fechar" onClick={fecharModalAluno}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
