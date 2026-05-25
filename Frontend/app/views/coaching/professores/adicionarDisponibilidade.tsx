import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useState } from 'react';
import { authService } from '~/services/auth.service';
import { RolesService } from '~/services/roles.service';
import { DisponibilidadesService } from '~/services/disponibilidades.service';
import { showToast } from '~/components/toast/toast';
import './adicionarDisponibilidade.scss';

interface DiaSemana {
    ID_Dia: number;
    Nome_Dia: string;
}

interface ExcecaoDisponibilidade {
    ID_Excecao: number;
    Data_Cancelada: string;
}

interface DisponibilidadeRecorrente {
    idDisponibilidade: number;
    horaInicio: string;
    horario: string;
    duracao: number;
    maxAlunos: number;
    modalidade: string;
    idProfessor: number;
    diaSemana?: number | null;
    ativa: boolean;
    diasSemana?: DiaSemana | null;
    excecoes?: ExcecaoDisponibilidade[];
}

const DIAS_SEMANA: DiaSemana[] = [
    { ID_Dia: 1, Nome_Dia: 'Segunda' },
    { ID_Dia: 2, Nome_Dia: 'Terca' },
    { ID_Dia: 3, Nome_Dia: 'Quarta' },
    { ID_Dia: 4, Nome_Dia: 'Quinta' },
    { ID_Dia: 5, Nome_Dia: 'Sexta' },
    { ID_Dia: 6, Nome_Dia: 'Sabado' },
    { ID_Dia: 7, Nome_Dia: 'Domingo' },
];

const HORAS_DIA = Array.from({ length: 24 }, (_, i) => i);

const initialForm = {
    diaSemana: 1,
    hora: '16:00',
    duracao: 60,
    maxAlunos: 4,
    modalidade: '',
};

function getDataAtualInput() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-PT');
}

function horaParaDataIso(hora: string) {
    return `1970-01-01T${hora}:00.000Z`;
}

function calcularPosicaoY(horaInicio: string) {
    const date = new Date(horaInicio);
    if (Number.isNaN(date.getTime())) return 0;
    return date.getHours() * 60 + date.getMinutes();
}

export default function AdicionarDisponibilidade() {
    const userInfo = authService.getUserInfo();
    const rolesService = new RolesService();
    const disponibilidadesService = new DisponibilidadesService();
    const hoje = getDataAtualInput();

    const [idProfessorAtivo, setIdProfessorAtivo] = useState<number | null>(null);
    const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeRecorrente[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDisponibilidade, setSelectedDisponibilidade] = useState<DisponibilidadeRecorrente | null>(null);
    const [isExceptionFormOpen, setIsExceptionFormOpen] = useState(false);
    const [exceptionDate, setExceptionDate] = useState('');
    const [form, setForm] = useState(initialForm);

    async function refreshDisponibilidades(idProfessor = idProfessorAtivo) {
        if (!idProfessor) return;

        setLoading(true);
        try {
            const data = await disponibilidadesService.getAvailability();
            const recorrentes = (data as DisponibilidadeRecorrente[])
                .filter((item) => item.idProfessor === idProfessor && item.diaSemana)
                .map((item) => ({ ...item, ativa: item.ativa ?? true }));

            setDisponibilidades(recorrentes);

            if (selectedDisponibilidade) {
                const refreshed = recorrentes.find(
                    (item) => item.idDisponibilidade === selectedDisponibilidade.idDisponibilidade,
                ) ?? null;
                setSelectedDisponibilidade(refreshed);
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar disponibilidades.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        async function fetchInitialData() {
            if (!userInfo?.sub) return;

            try {
                const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo.sub);
                if (respostaRoles?.idProfessor) {
                    setIdProfessorAtivo(respostaRoles.idProfessor);
                    await refreshDisponibilidades(respostaRoles.idProfessor);
                }
            } catch (error) {
                console.error(error);
                showToast('Nao foi possivel identificar o teu perfil de professor.');
            }
        }

        fetchInitialData();
    }, []);

    function processarDisponibilidadesDoDia(idDia: number) {
        const disponibilidadesDoDia = disponibilidades.filter((item) => item.diaSemana === idDia);

        const formatadas = disponibilidadesDoDia
            .map((item) => ({
                ...item,
                top: calcularPosicaoY(item.horaInicio),
                bottom: calcularPosicaoY(item.horaInicio) + item.duracao,
                coluna: 0,
            }))
            .sort((a, b) => a.top - b.top);

        const faixas: typeof formatadas[] = [];

        formatadas.forEach((disponibilidade) => {
            let colocada = false;

            for (let i = 0; i < faixas.length; i++) {
                const ultimaDisponibilidade = faixas[i][faixas[i].length - 1];
                if (disponibilidade.top >= ultimaDisponibilidade.bottom) {
                    faixas[i].push(disponibilidade);
                    disponibilidade.coluna = i;
                    colocada = true;
                    break;
                }
            }

            if (!colocada) {
                faixas.push([disponibilidade]);
                disponibilidade.coluna = faixas.length - 1;
            }
        });

        const maxColunas = faixas.length || 1;

        return formatadas.map((disponibilidade) => ({
            ...disponibilidade,
            width: `calc(${100 / maxColunas}% - 4px)`,
            left: `calc(${disponibilidade.coluna * (100 / maxColunas)}% + 2px)`,
        }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!idProfessorAtivo) {
            showToast('Erro: nao foi possivel identificar o teu perfil de professor.');
            return;
        }

        setLoading(true);

        const payload = {
            ID_Professor: idProfessorAtivo,
            AlteradoPorUtilizadorID: Number(userInfo?.sub),
            Hora_Inicio: horaParaDataIso(form.hora),
            Duracao: Number(form.duracao),
            MaxAlunos: Number(form.maxAlunos),
            Modalidade: form.modalidade,
            Dia_Semana: Number(form.diaSemana),
            Ativa: true,
        };

        try {
            await disponibilidadesService.criarDisponibilidade(payload);
            showToast('Disponibilidade criada com sucesso.');
            setForm(initialForm);
            setIsCreateModalOpen(false);
            await refreshDisponibilidades();
        } catch (error) {
            console.error(error);
            showToast('Erro ao criar disponibilidade. Tenta novamente.');
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleAtiva(disponibilidade: DisponibilidadeRecorrente) {
        setLoading(true);
        try {
            await disponibilidadesService.atualizarDisponibilidade(disponibilidade.idDisponibilidade, {
                Ativa: !disponibilidade.ativa,
            });
            showToast(disponibilidade.ativa ? 'Disponibilidade suspensa.' : 'Disponibilidade reativada.');
            await refreshDisponibilidades();
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar disponibilidade.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteDisponibilidade(disponibilidade: DisponibilidadeRecorrente) {
        const confirmacao = window.confirm(
            'Tem a certeza que deseja eliminar esta disponibilidade? Todas as excecoes associadas tambem serao apagadas.',
        );
        if (!confirmacao) return;

        setLoading(true);
        try {
            await disponibilidadesService.eliminarDisponibilidade(disponibilidade.idDisponibilidade);
            showToast('Disponibilidade eliminada com sucesso.');
            setSelectedDisponibilidade(null);
            await refreshDisponibilidades();
        } catch (error) {
            console.error(error);
            showToast('Erro ao eliminar disponibilidade.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateException() {
        if (!selectedDisponibilidade) return;
        if (!exceptionDate) {
            showToast('Escolhe uma data para a excecao.');
            return;
        }

        if (exceptionDate < hoje) {
            showToast('Nao e possivel criar excecoes em datas passadas.');
            return;
        }

        setLoading(true);
        try {
            await disponibilidadesService.criarExcecao(
                selectedDisponibilidade.idDisponibilidade,
                exceptionDate,
            );
            showToast('Excecao criada com sucesso.');
            setExceptionDate('');
            setIsExceptionFormOpen(false);
            await refreshDisponibilidades();
        } catch (error) {
            console.error(error);
            showToast('Erro ao criar excecao.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteException(idExcecao: number) {
        const confirmacao = window.confirm('Deseja remover esta excecao? A disponibilidade voltara a estar ativa nesse dia.');
        if (!confirmacao) return;

        setLoading(true);
        try {
            await disponibilidadesService.eliminarExcecao(idExcecao);
            showToast('Excecao removida com sucesso.');
            await refreshDisponibilidades();
        } catch (error) {
            console.error(error);
            showToast('Erro ao remover excecao.');
        } finally {
            setLoading(false);
        }
    }

    if (!idProfessorAtivo) {
        return <div className="pagina-adicionar-disponibilidade">A carregar perfil...</div>;
    }

    return (
        <div className="pagina-adicionar-disponibilidade">
            <div className="page-header">
                <div>
                    <h1>Disponibilidades</h1>
                    <p>Gere os horarios semanais em que podes dar sessoes de coaching.</p>
                </div>
                <ButtonComponent className="btn-primario" onClick={() => setIsCreateModalOpen(true)}>
                    <i className="fa-solid fa-plus"></i> Adicionar disponibilidade
                </ButtonComponent>
            </div>

            <div className="calendario-card">
                {loading && disponibilidades.length === 0 ? (
                    <div className="tabela-loading"><i className="fa-solid fa-spinner fa-spin"></i> A carregar grelha...</div>
                ) : (
                    <div className="calendario-wrapper">
                        <div className="calendario-canto-vazio">
                            <i className="fa-regular fa-clock"></i>
                        </div>

                        <div className="calendario-header-dias">
                            {DIAS_SEMANA.map((dia) => (
                                <div key={dia.ID_Dia} className="dia-header-item">
                                    {dia.Nome_Dia}
                                </div>
                            ))}
                        </div>

                        <div className="calendario-eixo-horas">
                            {HORAS_DIA.map((hora) => (
                                <div key={hora} className="hora-slot">
                                    <span>{hora.toString().padStart(2, '0')}:00</span>
                                </div>
                            ))}
                        </div>

                        <div className="calendario-grelha">
                            <div className="grelha-linhas-fundo">
                                {HORAS_DIA.map((hora) => (
                                    <div key={`linha-${hora}`} className="linha-hora"></div>
                                ))}
                            </div>

                            <div className="colunas-wrapper">
                                {DIAS_SEMANA.map((dia) => (
                                    <div key={dia.ID_Dia} className="coluna-dia">
                                        {processarDisponibilidadesDoDia(dia.ID_Dia).map((disponibilidade) => (
                                            <button
                                                key={disponibilidade.idDisponibilidade}
                                                type="button"
                                                className={`disponibilidade-card ${!disponibilidade.ativa ? 'inativa' : ''}`}
                                                style={{
                                                    top: `${disponibilidade.top}px`,
                                                    height: `${Math.max(disponibilidade.duracao, 34)}px`,
                                                    width: disponibilidade.width,
                                                    left: disponibilidade.left,
                                                }}
                                                onClick={() => {
                                                    setSelectedDisponibilidade(disponibilidade);
                                                    setIsExceptionFormOpen(false);
                                                    setExceptionDate('');
                                                }}
                                            >
                                                <span className="disponibilidade-titulo">{disponibilidade.modalidade}</span>
                                                <span className="disponibilidade-info">{disponibilidade.horario}</span>
                                                <span className="disponibilidade-meta">
                                                    {disponibilidade.maxAlunos} alunos
                                                    {(disponibilidade.excecoes?.length ?? 0) > 0 && (
                                                        <> - {disponibilidade.excecoes?.length} excecao</>
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="modal-content form-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Adicionar disponibilidade semanal</h3>
                            <ButtonComponent className="btn-fechar" onClick={() => setIsCreateModalOpen(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <form id="form-criar-disponibilidade" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <label>
                                        Dia da semana
                                        <select
                                            className="input-campo"
                                            value={form.diaSemana}
                                            onChange={(event) => setForm({ ...form, diaSemana: Number(event.target.value) })}
                                        >
                                            {DIAS_SEMANA.map((dia) => (
                                                <option key={dia.ID_Dia} value={dia.ID_Dia}>
                                                    {dia.Nome_Dia}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Hora de inicio
                                        <input
                                            type="time"
                                            className="input-campo"
                                            value={form.hora}
                                            onChange={(event) => setForm({ ...form, hora: event.target.value })}
                                            required
                                        />
                                    </label>

                                    <label>
                                        Duracao (min)
                                        <input
                                            type="number"
                                            className="input-campo"
                                            min={15}
                                            step={15}
                                            value={form.duracao}
                                            onChange={(event) => setForm({ ...form, duracao: Number(event.target.value) })}
                                            required
                                        />
                                    </label>

                                    <label>
                                        Maximo de alunos
                                        <input
                                            type="number"
                                            className="input-campo"
                                            min={1}
                                            value={form.maxAlunos}
                                            onChange={(event) => setForm({ ...form, maxAlunos: Number(event.target.value) })}
                                            required
                                        />
                                    </label>

                                    <label className="full-width">
                                        Modalidade
                                        <input
                                            type="text"
                                            className="input-campo"
                                            placeholder="Ex: Salsa, Kizomba..."
                                            value={form.modalidade}
                                            onChange={(event) => setForm({ ...form, modalidade: event.target.value })}
                                            required
                                        />
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <ButtonComponent type="button" className="btn-secundario" onClick={() => setIsCreateModalOpen(false)}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent type="submit" form="form-criar-disponibilidade" className="btn-primario" disabled={loading}>
                                {loading
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A gravar...</>
                                    : <><i className="fa-solid fa-check"></i> Gravar</>
                                }
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {selectedDisponibilidade && (
                <div className="modal-overlay" onClick={() => setSelectedDisponibilidade(null)}>
                    <div className="modal-content detalhes-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Detalhes da disponibilidade</h3>
                                <span>
                                    {selectedDisponibilidade.diasSemana?.Nome_Dia
                                        ?? DIAS_SEMANA.find((dia) => dia.ID_Dia === selectedDisponibilidade.diaSemana)?.Nome_Dia}
                                    {' '}as {formatTime(selectedDisponibilidade.horaInicio)}
                                </span>
                            </div>
                            <ButtonComponent className="btn-fechar" onClick={() => setSelectedDisponibilidade(null)}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <div className="modal-row">
                                <span>Modalidade</span>
                                <strong>{selectedDisponibilidade.modalidade}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Horario</span>
                                <strong>{selectedDisponibilidade.horario}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Duracao</span>
                                <strong>{selectedDisponibilidade.duracao} minutos</strong>
                            </div>
                            <div className="modal-row">
                                <span>Maximo de alunos</span>
                                <strong>{selectedDisponibilidade.maxAlunos}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Estado</span>
                                <strong className={selectedDisponibilidade.ativa ? 'estado-ativo' : 'estado-inativo'}>
                                    {selectedDisponibilidade.ativa ? 'Ativa' : 'Suspensa'}
                                </strong>
                            </div>

                            <div className="modal-divider" />

                            <div className="modal-row">
                                <span>Excecoes</span>
                                <strong>{selectedDisponibilidade.excecoes?.length ?? 0}</strong>
                            </div>

                            {selectedDisponibilidade.excecoes?.length ? (
                                <ul className="exception-list">
                                    {selectedDisponibilidade.excecoes.map((excecao) => (
                                        <li key={excecao.ID_Excecao}>
                                            <span>
                                                <i className="fa-regular fa-calendar-xmark"></i>
                                                {formatDate(excecao.Data_Cancelada)}
                                            </span>
                                            <ButtonComponent
                                                type="button"
                                                onClick={() => handleDeleteException(excecao.ID_Excecao)}
                                                disabled={loading}
                                                title="Remover excecao"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </ButtonComponent>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state">Sem excecoes registadas.</div>
                            )}

                            {!isExceptionFormOpen ? (
                                <ButtonComponent type="button" className="btn-secundario btn-full" onClick={() => setIsExceptionFormOpen(true)}>
                                    <i className="fa-solid fa-plus"></i> Adicionar excecao
                                </ButtonComponent>
                            ) : (
                                <form
                                    className="excecao-form-inline"
                                    onSubmit={async (event) => {
                                        event.preventDefault();
                                        await handleCreateException();
                                    }}
                                >
                                    <label>
                                        Data a suspender
                                        <input
                                            type="date"
                                            className="input-campo"
                                            min={hoje}
                                            value={exceptionDate}
                                            onChange={(event) => setExceptionDate(event.target.value)}
                                            required
                                        />
                                    </label>
                                    <div className="form-acoes-inline">
                                        <ButtonComponent type="submit" className="btn-primario" disabled={loading}>
                                            Confirmar
                                        </ButtonComponent>
                                        <ButtonComponent type="button" className="btn-secundario" onClick={() => setIsExceptionFormOpen(false)}>
                                            Cancelar
                                        </ButtonComponent>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            <ButtonComponent
                                type="button"
                                className={`btn-secundario ${selectedDisponibilidade.ativa ? 'btn-perigo' : 'btn-sucesso'}`}
                                onClick={() => handleToggleAtiva(selectedDisponibilidade)}
                                disabled={loading}
                            >
                                {selectedDisponibilidade.ativa
                                    ? <><i className="fa-solid fa-pause"></i> Suspender</>
                                    : <><i className="fa-solid fa-play"></i> Reativar</>
                                }
                            </ButtonComponent>
                            <ButtonComponent
                                type="button"
                                className="btn-secundario btn-perigo"
                                onClick={() => handleDeleteDisponibilidade(selectedDisponibilidade)}
                                disabled={loading}
                            >
                                <i className="fa-solid fa-trash"></i> Eliminar
                            </ButtonComponent>
                            <ButtonComponent type="button" className="btn-primario" onClick={() => setSelectedDisponibilidade(null)}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
