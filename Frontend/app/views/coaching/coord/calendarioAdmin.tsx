import React, { useEffect, useMemo, useState } from 'react';
import { calendarService } from '~/services/calendar.service';
import './calendarioAdmin.scss';

interface CalendarEvent {
    id: number;
    titulo: string;
    resumo?: string | null;
    descricao?: string | null;
    local?: string | null;
    dataInicio: string;
    dataFim?: string | null;
    tipo?: string | null;
}

interface CalendarCoaching {
    idCoaching: number;
    inicioCoaching: string;
    duracao: number;
    modalidade?: string | null;
    professor?: string | null;
    sala?: string | null;
    estado?: string | null;
    inscritos: number;
}

type ViewMode = 'month' | 'week' | 'day';

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
    const year = date.getFullYear();
    const easter = getEasterSunday(year);
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

function formatTime(dateString: string) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
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

    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }

    return days;
}

type CalendarItem =
    | { type: 'evento'; data: CalendarEvent }
    | { type: 'coaching'; data: CalendarCoaching };

export default function Calendario() {
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [eventos, setEventos] = useState<CalendarEvent[]>([]);
    const [coachings, setCoachings] = useState<CalendarCoaching[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

    const currentRange = useMemo(() => {
        if (viewMode === 'month') {
            const monthDays = getMonthGrid(selectedDate);
            const start = new Date(monthDays[0]);
            const end = new Date(monthDays[monthDays.length - 1]);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        const start = new Date(selectedDate);
        const end = new Date(selectedDate);

        if (viewMode === 'week') {
            const range = getWeekRange(selectedDate);
            range.start.setHours(0, 0, 0, 0);
            range.end.setHours(23, 59, 59, 999);
            return range;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }, [selectedDate, viewMode]);

    const startKey = useMemo(() => formatDateKey(currentRange.start), [currentRange.start]);
    const endKey = useMemo(() => formatDateKey(currentRange.end), [currentRange.end]);

    useEffect(() => {
        async function loadCalendar() {
            setIsLoading(true);
            setError(null);

            try {
                const data = await calendarService.getRange(startKey, endKey);
                setEventos(data.eventos || []);
                setCoachings(data.coachings || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar calendário.');
                setEventos([]);
                setCoachings([]);
            } finally {
                setIsLoading(false);
            }
        }

        loadCalendar();
    }, [startKey, endKey]);

    const openItemModal = (item: CalendarItem) => {
        setSelectedItem(item);
        setModalAberto(true);
    };

    const closeItemModal = () => {
        setModalAberto(false);
        setSelectedItem(null);
    };

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, { eventos: CalendarEvent[]; coachings: CalendarCoaching[] }>();

        eventos.forEach((evento) => {
            const date = new Date(evento.dataInicio);
            const key = formatDateKey(date);
            const entry = map.get(key) ?? { eventos: [], coachings: [] };
            entry.eventos.push(evento);
            map.set(key, entry);
        });

        coachings.forEach((coaching) => {
            const date = new Date(coaching.inicioCoaching);
            const key = formatDateKey(date);
            const entry = map.get(key) ?? { eventos: [], coachings: [] };
            entry.coachings.push(coaching);
            map.set(key, entry);
        });

        return map;
    }, [eventos, coachings]);

    const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
    const weekGrid = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

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

    const selectedHolidayName = getHolidayName(selectedDate);

    const activeRangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const start = currentRange.start.toLocaleDateString('pt-PT');
            const end = currentRange.end.toLocaleDateString('pt-PT');
            return `${start} – ${end}`;
        }

        if (viewMode === 'day') {
            const label = selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return selectedHolidayName ? `${label} — ${selectedHolidayName}` : label;
        }

        return formatMonthLabel(selectedDate);
    }, [selectedDate, viewMode, currentRange, selectedHolidayName]);

    return (
        <div className="calendario-admin">
            <div className="calendario-header">
                <div>
                    <h1>Calendário de Administração</h1>
                    <p className="calendario-range">{activeRangeLabel}</p>
                </div>

                <div className="calendario-actions">
                    <div className="calendario-buttons">
                        <button type="button" className="tool-button" onClick={() => changeDate(-1)} aria-label="Anterior">
                            ←
                        </button>
                        <button type="button" className="tool-button" onClick={() => setSelectedDate(new Date())}>
                            Hoje
                        </button>
                        <button type="button" className="tool-button" onClick={() => changeDate(1)} aria-label="Próximo">
                            →
                        </button>
                    </div>

                    <div className="view-mode-buttons">
                        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                className={`view-button ${viewMode === mode ? 'active' : ''}`}
                                onClick={() => {
                                    if (mode === 'month') {
                                        setSelectedDate(new Date());
                                    }
                                    setViewMode(mode);
                                }}
                            >
                                {mode === 'month' ? 'Mensal' : mode === 'week' ? 'Semanal' : 'Diário'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading && <div className="calendario-status">A carregar o calendário...</div>}
            {error && <div className="calendario-error">{error}</div>}

            {viewMode === 'day' ? (
                <div className="calendario-list">
                    <div className="day-summary">
                        <span className="day-summary-label">Dia selecionado</span>
                        <strong>{selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                        {selectedHolidayName && <span className="day-holiday">Feriado: {selectedHolidayName}</span>}
                    </div>
                    <div className="day-items">
                        {(() => {
                            const key = formatDateKey(selectedDate);
                            const items = dayItemsMap.get(key);

                            if (!items || (items.eventos.length === 0 && items.coachings.length === 0)) {
                                return <div className="empty-state">Não há eventos ou coachings neste dia.</div>;
                            }

                            return (
                                <>
                                    {items.eventos.map((evento) => (
                                        <div
                                            key={`evento-${evento.id}`}
                                            className="calendar-item event-item clickable"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openItemModal({ type: 'evento', data: evento });
                                            }}
                                        >
                                            <span className="item-label">Evento</span>
                                            <strong>{evento.titulo}</strong>
                                            <span className="item-detail">{formatTime(evento.dataInicio)}{evento.local ? ` • ${evento.local}` : ''}</span>
                                        </div>
                                    ))}
                                    {items.coachings.map((coaching) => (
                                        <div
                                            key={`coaching-${coaching.idCoaching}`}
                                            className="calendar-item coaching-item clickable"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openItemModal({ type: 'coaching', data: coaching });
                                            }}
                                        >
                                            <span className="item-label">Coaching</span>
                                            <strong>{coaching.modalidade || coaching.professor || 'Sessão de coaching'}</strong>
                                            <span className="item-detail">{formatTime(coaching.inicioCoaching)} • {coaching.estado || 'Sem estado'} • {coaching.inscritos} inscritos</span>
                                        </div>
                                    ))}
                                </>
                            );
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
                        const dayItems = dayItemsMap.get(dayKey);
                        const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                        const isToday = dayKey === formatDateKey(new Date());
                        const holidayName = getHolidayName(day);
                        const weekend = isWeekend(day);

                        const items = [
                            ...(dayItems?.eventos ?? []).map((evento) => ({ type: 'evento' as const, data: evento })),
                            ...(dayItems?.coachings ?? []).map((coaching) => ({ type: 'coaching' as const, data: coaching })),
                        ];

                        const previewItems = items.slice(0, 5);
                        const extraItems = items.length - previewItems.length;

                        return (
                            <div
                                key={dayKey}
                                className={`calendar-day ${viewMode === 'month' && !isCurrentMonth ? 'calendar-day--muted' : ''} ${isToday ? 'calendar-day--today' : ''} ${weekend ? 'calendar-day--weekend' : ''} ${holidayName ? 'calendar-day--holiday' : ''}`}
                                onClick={() => {
                                    setSelectedDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <div className="calendar-day-header">
                                    <span>{day.getDate()}</span>
                                    {holidayName && <span className="calendar-day-holiday">{holidayName}</span>}
                                </div>
                                <div className="calendar-day-items">
                                    {previewItems.map((item, index) =>
                                        item.type === 'evento' ? (
                                            <div
                                                key={`evento-${item.data.id}`}
                                                className="calendar-item calendar-item-small event-item clickable"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openItemModal(item);
                                                }}
                                            >
                                                <span className="item-badge">E</span>
                                                <div>
                                                    <strong>{item.data.titulo}</strong>
                                                    <span>{formatTime(item.data.dataInicio)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                key={`coaching-${item.data.idCoaching}`}
                                                className="calendar-item calendar-item-small coaching-item clickable"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openItemModal(item);
                                                }}
                                            >
                                                <span className="item-badge">C</span>
                                                <div>
                                                    <strong>{item.data.modalidade || item.data.professor || 'Coaching'}</strong>
                                                    <span>{formatTime(item.data.inicioCoaching)}</span>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                    {extraItems > 0 && (
                                        <div className="calendar-more">+{extraItems} mais</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalAberto && selectedItem && (
                <div className="modal-overlay" onClick={closeItemModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedItem.type === 'evento' ? 'Detalhes do Evento' : 'Detalhes do Coaching'}</h2>
                            <button type="button" className="modal-close" onClick={closeItemModal}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedItem.type === 'evento' ? (
                                <>
                                    <div className="modal-row">
                                        <span className="modal-label">Título</span>
                                        <span>{selectedItem.data.titulo}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Resumo</span>
                                        <span>{selectedItem.data.resumo || 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Descrição</span>
                                        <span>{selectedItem.data.descricao || 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Início</span>
                                        <span>{new Date(selectedItem.data.dataInicio).toLocaleString('pt-PT')}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Fim</span>
                                        <span>{selectedItem.data.dataFim ? new Date(selectedItem.data.dataFim).toLocaleString('pt-PT') : 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Local</span>
                                        <span>{selectedItem.data.local || 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Tipo</span>
                                        <span>{selectedItem.data.tipo || 'Não definido'}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="modal-row">
                                        <span className="modal-label">Modalidade</span>
                                        <span>{selectedItem.data.modalidade || 'Sem modalidade'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Professor</span>
                                        <span>{selectedItem.data.professor || 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Estúdio</span>
                                        <span>{selectedItem.data.sala || 'Não definido'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Início</span>
                                        <span>{new Date(selectedItem.data.inicioCoaching).toLocaleString('pt-PT')}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Duração</span>
                                        <span>{selectedItem.data.duracao ?? 'Não definido'} minutos</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Estado</span>
                                        <span>{selectedItem.data.estado || 'Sem estado'}</span>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">Inscritos</span>
                                        <span>{selectedItem.data.inscritos ?? 0}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
