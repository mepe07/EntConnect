import { ButtonComponent } from '~/components/button/button.component';
import './coaching.scss';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '~/services/auth.service';
import type { User } from '../../../models/interfaces/user.interface';
import { DisponibilidadesService } from '../../../services/disponibilidades.service';
import { SelectBoxComponent } from '~/components/selectbox/selectbox.component';
import { EEService } from '~/services/EE.service';
import { showToast } from '~/components/toast/toast';

interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    modalidadesProfessor: { idModalidade: number; descricao: string }[];
    estado: string;
    valorPorAluno: number;
    maxAlunos: number;
    idProfessor: number;
    idEstudio: number;
    duracao: number;
    idCoordenador: number;
    horaInicio?: string;
    diaSemana?: number | null;
    ativa?: boolean;
    excecoes?: { ID_Excecao: number; Data_Cancelada: string }[];
    sessoes?: {
        idCoaching: number;
        inicioCoaching: string;
        idModalidade?: number | null;
        alunosInscritosIds: number[];
    }[];
    alunosInscritosIds: number[];
}

interface Aluno {
    ID_aluno: number;
    Nome: string;
    Data_Nascimento: string;
    NIF: string;
    Mail?: string;
    Contato?: string;
    Menor_Idade: boolean;
}

type ViewMode = 'month' | 'week' | 'day';

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatPtDate(date: Date) {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseDataDisponibilidade(data: string) {
    const [dia, mes, ano] = data.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
}

function getDisponibilidadeDateTime(disponibilidade: Disponibilidade) {
    const date = parseDataDisponibilidade(disponibilidade.data);
    const [horaInicio] = disponibilidade.horario.split(' - ');
    const [horas = '0', minutos = '0'] = horaInicio.split(':');
    date.setHours(Number(horas), Number(minutos), 0, 0);
    return date;
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

function getIsoDateKey(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return formatDateKey(date);
}

function expandirDisponibilidadesRecorrentes(disponibilidades: Disponibilidade[]) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const fim = new Date(hoje);
    fim.setMonth(fim.getMonth() + 6);

    const expandidas: Disponibilidade[] = [];

    disponibilidades.forEach((disponibilidade) => {
        if (!disponibilidade.diaSemana) {
            expandidas.push(disponibilidade);
            return;
        }

        if (disponibilidade.ativa === false) return;

        const excecoes = new Set(
            (disponibilidade.excecoes ?? []).map((excecao) => getIsoDateKey(excecao.Data_Cancelada)),
        );

        for (let cursor = new Date(hoje); cursor <= fim; cursor.setDate(cursor.getDate() + 1)) {
            const diaSemanaPt = cursor.getDay() === 0 ? 7 : cursor.getDay();
            if (diaSemanaPt !== disponibilidade.diaSemana) continue;

            const dataKey = formatDateKey(cursor);
            if (excecoes.has(dataKey)) continue;

            const sessoesDaOcorrencia = (disponibilidade.sessoes ?? []).filter(
                (sessao) => getIsoDateKey(sessao.inicioCoaching) === dataKey,
            );
            const alunosInscritosIds = sessoesDaOcorrencia.flatMap((sessao) => sessao.alunosInscritosIds ?? []);
            const maxAlunosBase = disponibilidade.maxAlunos ?? 0;

            expandidas.push({
                ...disponibilidade,
                data: formatPtDate(cursor),
                maxAlunos: Math.max(maxAlunosBase - alunosInscritosIds.length, 0),
                alunosInscritosIds,
            });
        }
    });

    return expandidas;
}

export default function CoachingEE() {
    const userInfo = authService.getUserInfo() as User;
    if (userInfo.role !== 'Enc_Educacao') {
        return null;
    }

    const disponibilidadesService = new DisponibilidadesService();
    const eeService = new EEService();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [disponibilidadeSelecionada, setDisponibilidadeSelecionada] = useState<Disponibilidade | null>(null);
    const [alunoSelecionado, setAlunoSelecionado] = useState<number | null>(null);
    const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const disponibilidadesOrdenadas = useMemo(() => {
        return disponibilidades
            .filter((disp) => disp.maxAlunos > 0)
            .filter((disp) => (disp.modalidadesProfessor?.length ?? 0) > 0)
            .filter((disp) => (filtroProfessor ? disp.nomeProfessor === filtroProfessor : true))
            .filter((disp) => filtroModalidade
                ? disp.modalidadesProfessor?.some((modalidade) => modalidade.descricao === filtroModalidade)
                : true)
            .sort((a, b) => getDisponibilidadeDateTime(a).getTime() - getDisponibilidadeDateTime(b).getTime());
    }, [disponibilidades, filtroProfessor, filtroModalidade]);

    const dayItemsMap = useMemo(() => {
        const map = new Map<string, Disponibilidade[]>();

        disponibilidadesOrdenadas.forEach((disponibilidade) => {
            const key = formatDateKey(parseDataDisponibilidade(disponibilidade.data));
            const entry = map.get(key) ?? [];
            entry.push(disponibilidade);
            map.set(key, entry);
        });

        map.forEach((items) => {
            items.sort((a, b) => getDisponibilidadeDateTime(a).getTime() - getDisponibilidadeDateTime(b).getTime());
        });

        return map;
    }, [disponibilidadesOrdenadas]);

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

    async function fetchDisponibilidades() {
        setIsLoading(true);
        setError(null);

        try {
            const data = await disponibilidadesService.getAvailability();
            const approved = data.filter((disp: Disponibilidade) => disp.estado === 'Aprovado');
            setDisponibilidades(expandirDisponibilidadesRecorrentes(approved));
        } catch (err) {
            console.error('Erro ao buscar disponibilidades:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar disponibilidades.');
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchAlunos() {
        const idEE = userInfo.idPessoa;
        const data = await eeService.getAlunosByEE(idEE);
        setAlunos(data);
    }

    async function handleInscreverAluno() {
        if (!disponibilidadeSelecionada || !alunoSelecionado || !modalidadeSelecionada) {
            showToast('Por favor selecione uma sessão e um aluno.');
            return;
        }

        try {
            const inicioCoachingFormatado = getDisponibilidadeDateTime(disponibilidadeSelecionada).toISOString();

            const payload = {
                idAluno: alunoSelecionado,
                idEncEducacao: userInfo.idPessoa,
                idProfessor: disponibilidadeSelecionada.idProfessor,
                idEstadoCoaching: 7,
                idSala: disponibilidadeSelecionada.idEstudio,
                valorPorAluno: disponibilidadeSelecionada.valorPorAluno,
                idModalidade: modalidadeSelecionada,
                inicio_Coaching: inicioCoachingFormatado,
                duracao: disponibilidadeSelecionada.duracao,
                idCoordenador: disponibilidadeSelecionada.idCoordenador,
                valorEmFalta: disponibilidadeSelecionada.valorPorAluno,
                obs: observacoes
            };

            await eeService.inscreverAlunoCoaching(
                disponibilidadeSelecionada.idDisponibilidade,
                payload
            );

            showToast('Aluno inscrito com sucesso!');
            fecharModal();
            fetchDisponibilidades();
        } catch (err: any) {
            console.error('Erro ao inscrever aluno:', err);
            showToast(err.message || 'Não foi possível inscrever o aluno.');
        }
    }

    function abrirModal(disponibilidade: Disponibilidade) {
        setDisponibilidadeSelecionada(disponibilidade);
        setAlunoSelecionado(null);
        setModalidadeSelecionada(
            disponibilidade.modalidadesProfessor?.length === 1
                ? disponibilidade.modalidadesProfessor[0].idModalidade
                : null
        );
        setModalAberto(true);
    }

    function fecharModal() {
        setObservacoes('');
        setModalAberto(false);
        setDisponibilidadeSelecionada(null);
        setAlunoSelecionado(null);
        setModalidadeSelecionada(null);
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

    useEffect(() => {
        fetchDisponibilidades();
        fetchAlunos();
    }, []);

    const professoresUnicos = Array.from(new Set(disponibilidades.map((item) => item.nomeProfessor).filter(Boolean))).sort();
    const modalidadesUnicas = Array.from(new Set(
        disponibilidades.flatMap((item) => item.modalidadesProfessor?.map((modalidade) => modalidade.descricao) ?? [])
    )).sort();

    const alunosOptions = alunos
        .filter((aluno) => {
            if (!disponibilidadeSelecionada) return true;
            return !disponibilidadeSelecionada.alunosInscritosIds.includes(aluno.ID_aluno);
        })
        .map((aluno) => ({
            value: aluno.ID_aluno.toString(),
            label: aluno.Nome
        }));

    const renderDisponibilidadeCard = (disponibilidade: Disponibilidade, small = false) => (
        <button
            key={`${disponibilidade.idDisponibilidade}-${disponibilidade.data}`}
            type="button"
            className={`calendar-item disponibilidade-item ${small ? 'calendar-item-small' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                abrirModal(disponibilidade);
            }}
        >
            <span className="item-badge">C</span>
            <span className="item-copy">
                <strong>Coaching</strong>
                <span>Prof. {disponibilidade.nomeProfessor || 'Professor não definido'}</span>
                <span>{disponibilidade.modalidadesProfessor?.map((modalidade) => modalidade.descricao).join(', ') || 'Sem modalidades associadas'}</span>
                <span>{disponibilidade.horario}</span>
            </span>
        </button>
    );

    return (
        <div className="pagina-coaching-ee">
            <div className="calendario-header">
                <div>
                    <h1>Oferta de Coaching</h1>
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
                    <label>Professor</label>
                    <SelectBoxComponent
                        id="filtro-professor"
                        selectedOption={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...professoresUnicos.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>

                <div className="filtro-item">
                    <label>Modalidade</label>
                    <SelectBoxComponent
                        id="filtro-modalidade"
                        selectedOption={filtroModalidade}
                        onChange={(e) => setFiltroModalidade(e.target.value)}
                        options={[{ value: '', label: 'Todas' }, ...modalidadesUnicas.map((modalidade) => ({ value: modalidade, label: modalidade }))]}
                    />
                </div>
            </div>

            {isLoading && <div className="calendario-status">A carregar disponibilidades...</div>}
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
                                return <div className="empty-state">Não há disponibilidades neste dia.</div>;
                            }

                            return items.map((disponibilidade) => renderDisponibilidadeCard(disponibilidade));
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
                    <div className="calendar-weekday">Sab</div>
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
                                    {previewItems.map((disponibilidade) => renderDisponibilidadeCard(disponibilidade, true))}
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

            {modalAberto && disponibilidadeSelecionada && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Inscrever aluno</h2>
                            <ButtonComponent className="modal-fechar" onClick={fecharModal} aria-label="Fechar">
                                <i className="fa-solid fa-xmark" />
                            </ButtonComponent>
                        </div>

                        <div className="modal-corpo">
                            <div className="session-info">
                                <h3>Detalhes da disponibilidade</h3>
                                <p><strong>Professor:</strong> {disponibilidadeSelecionada.nomeProfessor}</p>
                                <p><strong>Data:</strong> {disponibilidadeSelecionada.data}</p>
                                <p><strong>Horário:</strong> {disponibilidadeSelecionada.horario}</p>
                                <p><strong>Modalidades:</strong> {disponibilidadeSelecionada.modalidadesProfessor?.map((modalidade) => modalidade.descricao).join(', ') || 'Sem modalidades associadas'}</p>
                                <p><strong>Duração:</strong> {disponibilidadeSelecionada.duracao} minutos</p>
                                <p><strong>Vagas disponíveis:</strong> {disponibilidadeSelecionada.maxAlunos}</p>
                                <p><strong>Valor a pagar:</strong> {disponibilidadeSelecionada.valorPorAluno.toFixed(2)}€</p>
                            </div>

                            <div className="form-group">
                                <label>Modalidade</label>
                                <SelectBoxComponent
                                    id="modalidade-select"
                                    selectedOption={modalidadeSelecionada?.toString() || ''}
                                    onChange={(e) => setModalidadeSelecionada(e.target.value ? Number(e.target.value) : null)}
                                    options={[
                                        { value: '', label: 'Selecione uma modalidade' },
                                        ...(disponibilidadeSelecionada.modalidadesProfessor ?? []).map((modalidade) => ({
                                            value: modalidade.idModalidade.toString(),
                                            label: modalidade.descricao,
                                        })),
                                    ]}
                                />
                            </div>

                            <div className="form-group">
                                <label>Aluno</label>
                                <SelectBoxComponent
                                    id="aluno-select"
                                    selectedOption={alunoSelecionado?.toString() || ''}
                                    onChange={(e) => setAlunoSelecionado(e.target.value ? Number(e.target.value) : null)}
                                    options={[{ value: '', label: 'Selecione um aluno' }, ...alunosOptions]}
                                />
                            </div>

                            <div className="form-group">
                                <label>Observações (Opcional)</label>
                                <textarea
                                    className="input-observacoes"
                                    rows={3}
                                    placeholder="Escreva aqui alguma observação que ache relevante"
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                />
                            </div>

                            <div className="modal-acoes">
                                <ButtonComponent className="btn-cancelar" onClick={fecharModal}>
                                    Cancelar
                                </ButtonComponent>
                                <ButtonComponent
                                    className="btn-confirmar"
                                    onClick={handleInscreverAluno}
                                    disabled={!alunoSelecionado || !modalidadeSelecionada}
                                >
                                    Inscrever
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
