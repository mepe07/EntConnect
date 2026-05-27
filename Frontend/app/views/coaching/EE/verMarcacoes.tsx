import { ButtonComponent } from '~/components/button/button.component';
import { SelectBoxComponent } from '~/components/selectbox/selectbox.component';
import './verMarcacoes.scss';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '~/services/auth.service';
import { EEService } from '~/services/EE.service';
import type { User } from '~/models/interfaces/user.interface';
import { showToast } from '~/components/toast/toast';

type ViewMode = 'month' | 'week' | 'day';

interface MarcacaoCalendario {
    idCoaching: number;
    idAluno: number;
    nomeAluno: string;
    nomeProfessor: string;
    modalidade: string;
    data: string;
    horario: string;
    valor: string;
    nomeSala: string;
    observacoes: string;
    dataInscricao: string;
    inicio: Date;
}

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

function formatHora(data: Date) {
    return data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export default function VerMarcacoes() {
    const userInfo = authService.getUserInfo() as User;
    if (userInfo.role !== 'Enc_Educacao') {
        return null;
    }

    const eeService = new EEService();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState('');
    const [filtroAluno, setFiltroAluno] = useState('');
    const [marcacoes, setMarcacoes] = useState<any[]>([]);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [marcacaoSelecionada, setMarcacaoSelecionada] = useState<MarcacaoCalendario | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchMarcacoes() {
        setIsLoading(true);
        setError(null);

        try {
            const data = await eeService.getMarcacoesByEE(userInfo.idPessoa || 0);
            setMarcacoes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao buscar marcações:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar marcações.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchMarcacoes();
    }, []);

    const marcacoesNormalizadas = useMemo<MarcacaoCalendario[]>(() => {
        return marcacoes
            .map((marcacao) => {
                const inicio = new Date(marcacao.Coaching?.Inicio_Coaching);
                const duracao = marcacao.Coaching?.Duracao || 0;
                const fim = new Date(inicio.getTime() + duracao * 60000);
                const dataInscricao = marcacao.Data_Inscricao ? new Date(marcacao.Data_Inscricao) : null;

                return {
                    idCoaching: marcacao.ID_Coaching,
                    idAluno: marcacao.ID_Aluno,
                    nomeAluno: marcacao.Aluno?.Nome || 'Desconhecido',
                    nomeProfessor: marcacao.Coaching?.Professor?.Pessoa?.Nome || 'Não atribuído',
                    modalidade:
                        marcacao.Coaching?.Modalidade?.Descricao ||
                        marcacao.Coaching?.Disponibilidade?.Modalidade ||
                        'N/A',
                    data: Number.isNaN(inicio.getTime()) ? 'Data inválida' : inicio.toLocaleDateString('pt-PT'),
                    horario: Number.isNaN(inicio.getTime()) ? 'Horário inválido' : `${formatHora(inicio)} - ${formatHora(fim)}`,
                    valor: marcacao.ValorEmFalta ? `${marcacao.ValorEmFalta} €` : '0 €',
                    nomeSala: marcacao.Coaching?.Sala?.Nome || 'Não definido',
                    observacoes: marcacao.Observacoes || 'Nenhuma observação.',
                    dataInscricao: dataInscricao && !Number.isNaN(dataInscricao.getTime())
                        ? `${dataInscricao.toLocaleDateString('pt-PT')} às ${formatHora(dataInscricao)}`
                        : 'Desconhecida',
                    inicio,
                };
            })
            .filter((marcacao) => !Number.isNaN(marcacao.inicio.getTime()))
            .filter((marcacao) => (filtroProfessor ? marcacao.nomeProfessor === filtroProfessor : true))
            .filter((marcacao) => (filtroAluno ? marcacao.nomeAluno === filtroAluno : true))
            .filter((marcacao) => (filtroModalidade ? marcacao.modalidade === filtroModalidade : true))
            .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    }, [marcacoes, filtroProfessor, filtroAluno, filtroModalidade]);

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, MarcacaoCalendario[]>();

        marcacoesNormalizadas.forEach((marcacao) => {
            const key = formatDateKey(marcacao.inicio);
            const entry = map.get(key) ?? [];
            entry.push(marcacao);
            map.set(key, entry);
        });

        map.forEach((items) => {
            items.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
        });

        return map;
    }, [marcacoesNormalizadas]);

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

    const modalidadesUnicas = Array.from(new Set(
        marcacoes
            .map((marcacao) =>
                marcacao.Coaching?.Modalidade?.Descricao ||
                marcacao.Coaching?.Disponibilidade?.Modalidade ||
                'N/A'
            )
            .filter(Boolean)
    )).sort();

    const professoresUnicos = Array.from(new Set(
        marcacoes
            .map((marcacao) => marcacao.Coaching?.Professor?.Pessoa?.Nome || 'Não atribuído')
            .filter(Boolean)
    )).sort();

    const alunosUnicos = Array.from(new Set(
        marcacoes
            .map((marcacao) => marcacao.Aluno?.Nome || 'Desconhecido')
            .filter(Boolean)
    )).sort();

    async function handleRemoverMarcacao(marcacao: MarcacaoCalendario) {
        if (window.confirm(`Tem a certeza que deseja cancelar a inscrição do aluno: ${marcacao.nomeAluno}?`)) {
            try {
                await eeService.removerAlunoCoaching(marcacao.idAluno, marcacao.idCoaching);
                showToast('Inscrição cancelada com sucesso!');
                fecharModal();
                fetchMarcacoes();
            } catch (err) {
                console.error('Erro ao cancelar inscrição:', err);
                showToast('Erro ao cancelar inscrição.');
            }
        }
    }

    function handleVerDetalhes(marcacao: MarcacaoCalendario) {
        setMarcacaoSelecionada(marcacao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setMarcacaoSelecionada(null);
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

    const renderMarcacaoCard = (marcacao: MarcacaoCalendario, small = false) => (
        <button
            key={`${marcacao.idCoaching}-${marcacao.idAluno}`}
            type="button"
            className={`calendar-item marcacao-item ${small ? 'calendar-item-small' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                handleVerDetalhes(marcacao);
            }}
        >
            <span className="item-badge">M</span>
            <span className="item-copy">
                <strong>{marcacao.modalidade || 'Coaching'}</strong>
                <span>Prof. {marcacao.nomeProfessor}</span>
                <span>{marcacao.horario}</span>
                <span>{marcacao.nomeAluno}</span>
            </span>
        </button>
    );

    return (
        <div className="ver-marcacoes-container">
            <div className="calendario-header">
                <div>
                    <h1>Marcações de Coaching</h1>
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

            <div className="filtros">
                <div className="filtro-item">
                    <label>Modalidade</label>
                    <SelectBoxComponent
                        id="filtro-modalidade"
                        selectedOption={filtroModalidade}
                        onChange={(e) => setFiltroModalidade(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...modalidadesUnicas.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>

                <div className="filtro-item">
                    <label>Professor</label>
                    <SelectBoxComponent
                        id="filtro-professor"
                        selectedOption={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...professoresUnicos.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>

                <div className="filtro-item">
                    <label>Aluno</label>
                    <SelectBoxComponent
                        id="filtro-aluno"
                        selectedOption={filtroAluno}
                        onChange={(e) => setFiltroAluno(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...alunosUnicos.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>
            </div>

            {isLoading && <div className="calendario-status">A carregar marcações...</div>}
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
                                return <div className="empty-state">Não há marcações neste dia.</div>;
                            }

                            return items.map((marcacao) => renderMarcacaoCard(marcacao));
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
                                    {previewItems.map((marcacao) => renderMarcacaoCard(marcacao, true))}
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

            {isModalAberto && marcacaoSelecionada && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Marcação</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModal} aria-label="Fechar">
                                <i className="fa-solid fa-xmark" />
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item">
                                <span>Aluno</span>
                                <strong>{marcacaoSelecionada.nomeAluno}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Professor</span>
                                <strong>{marcacaoSelecionada.nomeProfessor}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Data</span>
                                <strong>{marcacaoSelecionada.data}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Horário</span>
                                <strong>{marcacaoSelecionada.horario}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Modalidade</span>
                                <strong>{marcacaoSelecionada.modalidade}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Valor a Pagar</span>
                                <strong className="destaque-valor">{marcacaoSelecionada.valor}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Estúdio</span>
                                <strong>{marcacaoSelecionada.nomeSala}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Data da Inscrição</span>
                                <strong>{marcacaoSelecionada.dataInscricao}</strong>
                            </div>
                            <div className="detalhe-item detalhe-item--full">
                                <span>Observações</span>
                                <strong>{marcacaoSelecionada.observacoes}</strong>
                            </div>
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-cancelar-marcacao" onClick={() => handleRemoverMarcacao(marcacaoSelecionada)}>
                                Cancelar inscrição
                            </ButtonComponent>
                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
