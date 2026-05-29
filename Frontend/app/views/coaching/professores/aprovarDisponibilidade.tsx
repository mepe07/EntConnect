import { ButtonComponent } from '~/components/button/button.component';
import './aprovarDisponibilidade.scss';
import { useEffect, useMemo, useState } from 'react';
import { DisponibilidadesService } from '../../../services/disponibilidades.service';
import { authService } from '~/services/auth.service';
import type { User } from '../../../models/interfaces/user.interface';
import { showToast } from '~/components/toast/toast';

interface DiaSemana {
    ID_Dia: number;
    Nome_Dia: string;
}

interface ExcecaoDisponibilidade {
    ID_Excecao: number;
    Data_Cancelada: string;
}

export interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    alteradoPor: string;
    estado: string;
    maxAlunos: number;
    idEstudio?: number | null;
    valorPorAluno?: number;
    modalidadesProfessor?: { idModalidade: number; descricao: string }[];
    duracao: number;
    horaInicio: string;
    diaSemana?: number | null;
    ativa?: boolean;
    diasSemana?: DiaSemana | null;
    excecoes?: ExcecaoDisponibilidade[];
}

interface DisponibilidadeCalendario {
    base: Disponibilidade;
    data: string;
    dataKey: string;
    sortTime: number;
}

export interface Estudio {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
}

type ViewMode = 'month' | 'week' | 'day';

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDataDisponibilidade(data: string) {
    const [dia, mes, ano] = data.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
}

function parseHorarioInicio(horario: string) {
    const [horaInicio = '00:00'] = horario.split(' - ');
    return horaInicio;
}

function combineDateAndTime(date: Date, timeValue: string) {
    const [hora, minuto] = timeValue.split(':').map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hora || 0, minuto || 0);
}

function formatMonthLabel(date: Date) {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
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

function dataIsoDeValor(valor: string) {
    const isoMatch = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor.slice(0, 10);

    return formatDateKey(data);
}


function normalizarEstado(estado?: string) {
    return (estado ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function disponibilidadeTemExcecao(disponibilidade: Disponibilidade, dateKey: string) {
    return disponibilidade.excecoes?.some((excecao) => dataIsoDeValor(excecao.Data_Cancelada) === dateKey) ?? false;
}

function expandirDisponibilidadesParaCalendario(disponibilidades: Disponibilidade[], start: Date, end: Date) {
    const items: DisponibilidadeCalendario[] = [];

    disponibilidades.forEach((disponibilidade) => {
        if (disponibilidade.ativa === false) return;

        if (disponibilidade.diaSemana) {
            for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
                const diaSemanaPt = cursor.getDay() === 0 ? 7 : cursor.getDay();
                if (diaSemanaPt !== disponibilidade.diaSemana) continue;

                const dateKey = formatDateKey(cursor);
                if (disponibilidadeTemExcecao(disponibilidade, dateKey)) continue;

                const date = new Date(cursor);
                const horarioInicio = parseHorarioInicio(disponibilidade.horario);
                const sortDate = combineDateAndTime(date, horarioInicio);

                items.push({
                    base: disponibilidade,
                    data: date.toLocaleDateString('pt-PT'),
                    dataKey: dateKey,
                    sortTime: sortDate.getTime(),
                });
            }
            return;
        }

        const dataReal = new Date(disponibilidade.horaInicio);
        if (Number.isNaN(dataReal.getTime())) return;

        const dateKey = formatDateKey(dataReal);
        if (dataReal < start || dataReal > end) return;
        if (disponibilidadeTemExcecao(disponibilidade, dateKey)) return;

        items.push({
            base: disponibilidade,
            data: dataReal.toLocaleDateString('pt-PT'),
            dataKey: dateKey,
            sortTime: dataReal.getTime(),
        });
    });

    return items.sort((a, b) => a.sortTime - b.sortTime);
}

function getNextOccurrence(disponibilidade: Disponibilidade) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!disponibilidade.diaSemana) {
        const data = new Date(disponibilidade.horaInicio);
        if (Number.isNaN(data.getTime())) return null;
        return data;
    }

    for (let i = 0; i < 365; i++) {
        const candidate = new Date(hoje);
        candidate.setDate(hoje.getDate() + i);
        const diaSemanaPt = candidate.getDay() === 0 ? 7 : candidate.getDay();
        if (diaSemanaPt !== disponibilidade.diaSemana) continue;
        if (disponibilidadeTemExcecao(disponibilidade, formatDateKey(candidate))) continue;
        return candidate;
    }

    return null;
}

export default function ApproveAvailability() {
    const userInfo = authService.getUserInfo() as User;
    const isCoordenador = userInfo?.role?.toLowerCase().includes('coord');

    const disponibilidadesService = new DisponibilidadesService();

    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [linhaSelecionada, setLinhaSelecionada] = useState<Disponibilidade | null>(null);
    const [dataReferenciaSelecionada, setDataReferenciaSelecionada] = useState<string | null>(null);
    const [valorPorAluno, setValorPorAluno] = useState('');
    const [maxAlunosSelecionado, setMaxAlunosSelecionado] = useState('1');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [loading, setLoading] = useState(false);
    const [pendentesColapsados, setPendentesColapsados] = useState(true);

    async function fetchDisponibilidades() {
        try {
            const data = await disponibilidadesService.getAvailability() as Disponibilidade[];
            setDisponibilidades(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao carregar disponibilidades:', error);
            setDisponibilidades([]);
        }
    }

    useEffect(() => {
        if (!isCoordenador) return;

        fetchDisponibilidades();
    }, [isCoordenador]);

    const weekGrid = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
    const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
    const displayedMonthGrid = useMemo(() => {
        const hoje = new Date();
        const isCurrentMonth =
            selectedDate.getFullYear() === hoje.getFullYear() &&
            selectedDate.getMonth() === hoje.getMonth();

        return isCurrentMonth ? reorderMonthGridToStartWithWeek(monthGrid, hoje) : monthGrid;
    }, [monthGrid, selectedDate]);

    const currentRange = useMemo(() => {
        if (viewMode === 'day') {
            const start = new Date(selectedDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        if (viewMode === 'week') {
            const { start, end } = getWeekRange(selectedDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        const start = new Date(monthGrid[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(monthGrid[monthGrid.length - 1]);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }, [monthGrid, selectedDate, viewMode]);

    const disponibilidadesCalendario = useMemo(
        () => expandirDisponibilidadesParaCalendario(disponibilidades, currentRange.start, currentRange.end),
        [currentRange.end, currentRange.start, disponibilidades],
    );

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, DisponibilidadeCalendario[]>();

        disponibilidadesCalendario.forEach((item) => {
            const entry = map.get(item.dataKey) ?? [];
            entry.push(item);
            map.set(item.dataKey, entry);
        });

        map.forEach((items) => {
            items.sort((a, b) => a.sortTime - b.sortTime);
        });

        return map;
    }, [disponibilidadesCalendario]);

    const pendentes = useMemo(() => {
        return disponibilidades
            .filter((item) => normalizarEstado(item.estado) === 'pendente')
            .map((item) => ({
                disponibilidade: item,
                proximaOcorrencia: getNextOccurrence(item),
            }))
            .sort((a, b) => {
                const timeA = a.proximaOcorrencia?.getTime() ?? Number.MAX_SAFE_INTEGER;
                const timeB = b.proximaOcorrencia?.getTime() ?? Number.MAX_SAFE_INTEGER;
                return timeA - timeB;
            });
    }, [disponibilidades]);

    const activeRangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const range = getWeekRange(selectedDate);
            return `${range.start.toLocaleDateString('pt-PT')} - ${range.end.toLocaleDateString('pt-PT')}`;
        }

        if (viewMode === 'day') {
            return selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }

        return formatMonthLabel(selectedDate);
    }, [selectedDate, viewMode]);

    function abrirModalAprovacao(disponibilidade: Disponibilidade, dataReferencia?: string) {
        setLinhaSelecionada(disponibilidade);
        setDataReferenciaSelecionada(dataReferencia ?? null);
        setValorPorAluno('');
        setMaxAlunosSelecionado('1');
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setLinhaSelecionada(null);
        setDataReferenciaSelecionada(null);
    }

    function getNomeEstudio(idEstudio?: number | null) {
        if (!idEstudio) return 'Por definir quando existir sessao';
        return `Estudio #${idEstudio}`;
    }

    async function confirmarAprovacao() {
        if (!linhaSelecionada) return;

        if (!valorPorAluno || !maxAlunosSelecionado) {
            showToast('Preenche os dados de aprovacao.');
            return;
        }

        if ((linhaSelecionada.modalidadesProfessor?.length ?? 0) === 0) {
            showToast('Associe pelo menos uma modalidade ao professor antes de aprovar esta disponibilidade.');
            return;
        }

        await handleAtualizarEstado(linhaSelecionada, 1, undefined, Number(valorPorAluno), Number(maxAlunosSelecionado));
        fecharModal();
    }

    async function handleAtualizarEstado(disponibilidade: Disponibilidade, novoEstado: number, idEstudio?: number, valorPorAluno?: number, maxAlunos?: number) {
        const alteradoPor = userInfo.idUtilizador;
        const horaInicioIso = disponibilidade.horaInicio;

        if (novoEstado === 3 && !window.confirm('Tem a certeza que deseja rejeitar esta disponibilidade?')) {
            return;
        }

        setLoading(true);
        try {
            await disponibilidadesService.atualizarEstado(
                disponibilidade.idDisponibilidade,
                novoEstado,
                horaInicioIso,
                disponibilidade.duracao,
                alteradoPor,
                idEstudio,
                valorPorAluno,
                maxAlunos,
            );

            await fetchDisponibilidades();
            showToast(novoEstado === 1 ? 'Disponibilidade aprovada.' : 'Disponibilidade rejeitada.');
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar a disponibilidade.');
        } finally {
            setLoading(false);
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

    const disponibilidadeAprovada = normalizarEstado(linhaSelecionada?.estado) === 'aprovado';

    if (!isCoordenador) {
        return (
            <div className="pagina-aprovacoes acesso-negado">
                <h1>Acesso negado</h1>
            </div>
        );
    }

    return (
        <div className="pagina-aprovacoes">
            <div className="page-header">
                <div>
                    <h1>Disponibilidades dos professores</h1>
                    <p>Aprova rapidamente os pedidos pendentes e consulta a grelha completa no calendário.</p>
                </div>
            </div>

            <section className={`pendentes-section ${pendentesColapsados ? 'is-collapsed' : ''}`}>
                <div className="section-header">
                    <button type="button" className="section-toggle" onClick={() => setPendentesColapsados((atual) => !atual)}>
                        <h2>Por aprovar</h2>
                        <p>{pendentes.length} disponibilidade{pendentes.length === 1 ? '' : 's'} pendente{pendentes.length === 1 ? '' : 's'}</p>
                        <span className="section-toggle-icon">
                            <i className={`fa-solid ${pendentesColapsados ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                        </span>
                    </button>
                    <div className="section-tools">
                        <ButtonComponent type="button" className="tool-button" onClick={fetchDisponibilidades} disabled={loading}>
                            <i className="fa-solid fa-rotate"></i> Atualizar
                        </ButtonComponent>
                    </div>
                </div>

                {pendentesColapsados ? null : pendentes.length === 0 ? (
                    <div className="empty-state">Não existem disponibilidades pendentes.</div>
                ) : (
                    <div className="pendentes-list">
                        {pendentes.map(({ disponibilidade, proximaOcorrencia }) => (
                            <article key={disponibilidade.idDisponibilidade} className="pendente-card">
                                <div className="pendente-main">
                                    <span className="pendente-date">
                                        {proximaOcorrencia
                                            ? proximaOcorrencia.toLocaleDateString('pt-PT')
                                            : disponibilidade.diasSemana?.Nome_Dia ?? disponibilidade.data}
                                    </span>
                                    <h3>{disponibilidade.nomeProfessor}</h3>
                                    <p>{disponibilidade.horario}</p>
                                    <small>{disponibilidade.diaSemana ? 'Disponibilidade semanal' : 'Disponibilidade única'}</small>
                                </div>
                                <div className="pendente-actions">
                                    <ButtonComponent
                                        type="button"
                                        className="btn-aprovar"
                                        onClick={() => abrirModalAprovacao(disponibilidade, proximaOcorrencia ? proximaOcorrencia.toLocaleDateString('pt-PT') : disponibilidade.data)}
                                        disabled={loading}
                                    >
                                        <i className="fa-solid fa-check"></i> Aprovar
                                    </ButtonComponent>
                                    <ButtonComponent
                                        type="button"
                                        className="btn-rejeitar"
                                        onClick={() => handleAtualizarEstado(disponibilidade, 3)}
                                        disabled={loading}
                                    >
                                        <i className="fa-solid fa-xmark"></i> Rejeitar
                                    </ButtonComponent>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="calendar-section">
                <div className="calendar-header">
                    <div>
                        <h2>Calendário de disponibilidades</h2>
                        <p className="calendar-range">{activeRangeLabel}</p>
                    </div>

                    <div className="calendar-actions">
                        <div className="calendar-buttons">
                            <ButtonComponent type="button" className="tool-button" onClick={() => changeDate(-1)} aria-label="Anterior">
                                <i className="fa-solid fa-arrow-left" />
                            </ButtonComponent>
                            <ButtonComponent type="button" className="tool-button" onClick={() => setSelectedDate(new Date())}>
                                Hoje
                            </ButtonComponent>
                            <ButtonComponent type="button" className="tool-button" onClick={() => changeDate(1)} aria-label="Seguinte">
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
                    <div className="calendar-list">
                        <div className="calendar-weekday">
                            <span>{selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div className="calendar-day calendar-day--single">
                            {(dayItemsMap.get(formatDateKey(selectedDate)) ?? []).length === 0 ? (
                                <div className="day-empty">Sem disponibilidades neste dia.</div>
                            ) : (
                                (dayItemsMap.get(formatDateKey(selectedDate)) ?? []).map((item) => (
                                    <button
                                        key={`${item.base.idDisponibilidade}-${item.dataKey}`}
                                        type="button"
                                        className={`calendar-item ${normalizarEstado(item.base.estado) === 'pendente' ? 'calendar-item-pending' : ''}`}
                                        onClick={() => abrirModalAprovacao(item.base, item.data)}
                                    >
                                        <span className="item-copy">
                                            <strong>{item.base.nomeProfessor}</strong>
                                            <span>{item.base.horario}</span>
                                            <span>{item.base.diaSemana ? 'Semanal' : item.data}</span>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`calendar-grid calendar-grid--${viewMode}`}>
                        {(viewMode === 'week' ? weekGrid : displayedMonthGrid).map((day) => {
                            const dayKey = formatDateKey(day);
                            const dayItems = dayItemsMap.get(dayKey) ?? [];
                            const isToday = dayKey === formatDateKey(new Date());
                            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                            const previewItems = viewMode === 'month' ? dayItems.slice(0, 3) : dayItems;

                            return (
                                <button
                                    key={dayKey}
                                    type="button"
                                    className={`calendar-day ${viewMode === 'month' && !isCurrentMonth ? 'calendar-day--muted' : ''} ${isToday ? 'calendar-day--today' : ''}`}
                                    onClick={() => {
                                        setSelectedDate(day);
                                        if (viewMode === 'month') setViewMode('day');
                                    }}
                                >
                                    <div className="day-header">
                                        <span className="day-number">{day.getDate()}</span>
                                        <small className="day-summary">{dayItems.length} disp.</small>
                                    </div>

                                    <div className="day-items">
                                        {previewItems.length === 0 ? (
                                            <div className="day-empty">{viewMode === 'week' ? 'Sem registos' : ''}</div>
                                        ) : (
                                            previewItems.map((item) => (
                                                <div
                                                    key={`${item.base.idDisponibilidade}-${item.dataKey}`}
                                                    className={`calendar-item ${normalizarEstado(item.base.estado) === 'pendente' ? 'calendar-item-pending' : ''}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        abrirModalAprovacao(item.base, item.data);
                                                    }}
                                                >
                                                    <span className="item-copy">
                                                        <strong>{item.base.nomeProfessor}</strong>
                                                        <span>{item.base.horario}</span>
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                        {viewMode === 'month' && dayItems.length > 3 && (
                                            <div className="calendar-more">+{dayItems.length - 3} adicionais</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {modalAberto && linhaSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <div>
                                <h2>{disponibilidadeAprovada ? 'Detalhes da disponibilidade' : 'Aprovar disponibilidade'}</h2>
                                <p>{linhaSelecionada.nomeProfessor} • {dataReferenciaSelecionada ?? linhaSelecionada.data} • {linhaSelecionada.horario}</p>
                            </div>
                            <ButtonComponent className="modal-fechar" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark" />
                            </ButtonComponent>
                        </div>

                        <div className="modal-corpo">
                            {disponibilidadeAprovada ? (
                                <div className="detalhes-grid">
                                    <div className="detalhe-item">
                                        <span>Estado</span>
                                        <strong>{linhaSelecionada.estado}</strong>
                                    </div>
                                    <div className="detalhe-item">
                                        <span>Estúdio</span>
                                        <strong>{getNomeEstudio(linhaSelecionada.idEstudio)}</strong>
                                    </div>
                                    <div className="detalhe-item">
                                        <span>Máximo de alunos</span>
                                        <strong>{linhaSelecionada.maxAlunos ?? 'N/D'}</strong>
                                    </div>
                                    <div className="detalhe-item">
                                        <span>Valor por aluno</span>
                                        <strong>{linhaSelecionada.valorPorAluno ? `${linhaSelecionada.valorPorAluno} €` : 'N/D'}</strong>
                                    </div>
                                    <div className="detalhe-item">
                                        <span>Alterado por</span>
                                        <strong>{linhaSelecionada.alteradoPor}</strong>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Máximo de alunos</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={maxAlunosSelecionado}
                                            onChange={(e) => setMaxAlunosSelecionado(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Valor por aluno (€)</label>
                                        <input
                                            type="number"
                                            value={valorPorAluno}
                                            onChange={(e) => setValorPorAluno(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="modal-acoes">
                                <ButtonComponent className="btn-cancelar" onClick={fecharModal}>
                                    {disponibilidadeAprovada ? 'Fechar' : 'Cancelar'}
                                </ButtonComponent>
                                {!disponibilidadeAprovada && (
                                    <ButtonComponent
                                        className="btn-confirmar"
                                        onClick={confirmarAprovacao}
                                        disabled={!valorPorAluno || !maxAlunosSelecionado || loading}
                                    >
                                        Confirmar aprovação
                                    </ButtonComponent>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


