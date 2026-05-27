import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useState } from 'react';
import { authService } from '~/services/auth.service';
import { RolesService } from '~/services/roles.service';
import { DisponibilidadesService } from '~/services/disponibilidades.service';
import { showToast } from '~/components/toast/toast';
import { SelectBoxComponent } from '~/components/selectbox/selectbox.component';
import { coachingPropostasService } from '~/services/coachingPropostas.service';
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
    estado: string;
    idProfessor: number;
    diaSemana?: number | null;
    ativa: boolean;
    diasSemana?: DiaSemana | null;
    excecoes?: ExcecaoDisponibilidade[];
}

interface ModalidadeProposta {
    idModalidade: number;
    descricao: string;
}

interface EncarregadoProposta {
    idEncEducacao: number;
    nome: string;
    email: string | null;
    alunos: { idAluno: number; nome: string }[];
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
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);
    if (isoDate) {
        const [ano, mes, dia] = isoDate;
        return `${dia}/${mes}/${ano}`;
    }

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

function normalizarEstado(estado?: string) {
    return (estado ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function getEstadoClass(disponibilidade: DisponibilidadeRecorrente) {
    if (!disponibilidade.ativa) return 'inativa';
    if (normalizarEstado(disponibilidade.estado) === 'pendente') return 'pendente';
    return '';
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
    const [isPropostaModalOpen, setIsPropostaModalOpen] = useState(false);
    const [modalidadesProposta, setModalidadesProposta] = useState<ModalidadeProposta[]>([]);
    const [encarregados, setEncarregados] = useState<EncarregadoProposta[]>([]);
    const [loadingEncarregados, setLoadingEncarregados] = useState(false);
    const [erroPesquisaEE, setErroPesquisaEE] = useState<string | null>(null);
    const [pesquisaEE, setPesquisaEE] = useState('');
    const [propostaEE, setPropostaEE] = useState<number | null>(null);
    const [propostaModalidade, setPropostaModalidade] = useState<number | null>(null);
    const [propostaAlunos, setPropostaAlunos] = useState<number[]>([]);
    const [propostaData, setPropostaData] = useState('');
    const [propostaHora, setPropostaHora] = useState('16:00');
    const [propostaDuracao, setPropostaDuracao] = useState(60);
    const [propostaMensagem, setPropostaMensagem] = useState('');
    const [isSubmittingProposta, setIsSubmittingProposta] = useState(false);

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

                const contexto = await coachingPropostasService.getContexto();
                const professorContexto = (contexto.professores ?? []).find(
                    (professor: any) => professor.idProfessor === respostaRoles?.idProfessor,
                );
                setModalidadesProposta(professorContexto?.modalidades ?? []);
            } catch (error) {
                console.error(error);
                showToast('Nao foi possivel identificar o teu perfil de professor.');
            }
        }

        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!isPropostaModalOpen) return;

        const timeoutId = window.setTimeout(async () => {
            setLoadingEncarregados(true);
            setErroPesquisaEE(null);

            try {
                const resultados = await coachingPropostasService.pesquisarEncarregados(pesquisaEE);
                setEncarregados(Array.isArray(resultados) ? resultados : []);
            } catch (error) {
                console.error(error);
                setEncarregados([]);
                setErroPesquisaEE('Nao foi possivel carregar encarregados.');
            } finally {
                setLoadingEncarregados(false);
            }
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [pesquisaEE, isPropostaModalOpen]);

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

    function fecharPropostaModal() {
        setIsPropostaModalOpen(false);
        setPesquisaEE('');
        setEncarregados([]);
        setErroPesquisaEE(null);
        setPropostaEE(null);
        setPropostaModalidade(null);
        setPropostaAlunos([]);
        setPropostaData('');
        setPropostaHora('16:00');
        setPropostaDuracao(60);
        setPropostaMensagem('');
    }

    function selecionarEncarregadoProposta(encarregado: EncarregadoProposta) {
        setPropostaEE(encarregado.idEncEducacao);
        setPesquisaEE(encarregado.nome);
        setPropostaAlunos([]);
    }

    function toggleAlunoProposta(idAluno: number) {
        setPropostaAlunos((atuais) =>
            atuais.includes(idAluno)
                ? atuais.filter((id) => id !== idAluno)
                : [...atuais, idAluno]
        );
    }

    async function handleCriarProposta() {
        if (!propostaEE || !propostaModalidade || propostaAlunos.length === 0 || !propostaData || !propostaHora) {
            showToast('Preenche encarregado, modalidade, data e pelo menos um aluno.');
            return;
        }

        setIsSubmittingProposta(true);
        try {
            const inicio = new Date(`${propostaData}T${propostaHora}:00`);
            await coachingPropostasService.criarProposta({
                idEncEducacao: propostaEE,
                idModalidade: propostaModalidade,
                inicio: inicio.toISOString(),
                duracaoMinutos: propostaDuracao,
                alunosIds: propostaAlunos,
                mensagem: propostaMensagem.trim() || undefined,
            });

            showToast('Proposta enviada para aprovação da coordenação.');
            fecharPropostaModal();
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : 'Não foi possível enviar a proposta.');
        } finally {
            setIsSubmittingProposta(false);
        }
    }

    const encarregadoSelecionado = encarregados.find((encarregado) => encarregado.idEncEducacao === propostaEE);

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
                <ButtonComponent className="btn-secundario-topo" onClick={() => setIsPropostaModalOpen(true)}>
                    <i className="fa-solid fa-calendar-plus"></i> Propor sessão
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
                                                className={`disponibilidade-card ${getEstadoClass(disponibilidade)}`}
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
                                                <span className="disponibilidade-titulo">Disponivel</span>
                                                <span className="disponibilidade-info">{disponibilidade.horario}</span>
                                                <span className="disponibilidade-meta">
                                                    {disponibilidade.estado}
                                                    {(disponibilidade.excecoes?.length ?? 0) > 0 && (
                                                        <> - {disponibilidade.excecoes?.length} excecao</>
                                                    )}
                                                </span>
                                                {normalizarEstado(disponibilidade.estado) === 'pendente' && (
                                                    <span className="estado-mini">Pendente</span>
                                                )}
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
                                <span>Horario</span>
                                <strong>{selectedDisponibilidade.horario}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Duracao</span>
                                <strong>{selectedDisponibilidade.duracao} minutos</strong>
                            </div>
                            <div className="modal-row">
                                <span>Disponibilidade</span>
                                <strong className={selectedDisponibilidade.ativa ? 'estado-ativo' : 'estado-inativo'}>
                                    {selectedDisponibilidade.ativa ? 'Ativa' : 'Suspensa'}
                                </strong>
                            </div>
                            <div className="modal-row">
                                <span>Aprovacao</span>
                                <strong
                                    className={
                                        normalizarEstado(selectedDisponibilidade.estado) === 'pendente'
                                            ? 'estado-pendente'
                                            : 'estado-ativo'
                                    }
                                >
                                    {selectedDisponibilidade.estado || 'Sem estado'}
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

            {isPropostaModalOpen && (
                <div className="modal-overlay" onClick={fecharPropostaModal}>
                    <div className="modal-content form-modal proposta-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Propor sessão única</h3>
                            <ButtonComponent className="btn-fechar" onClick={fecharPropostaModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <div className="form-grid proposta-grid">
                                <label>
                                    Pesquisar enc. educação
                                    <input
                                        type="search"
                                        className="input-campo"
                                        value={pesquisaEE}
                                        onChange={(event) => {
                                            setPesquisaEE(event.target.value);
                                            setPropostaEE(null);
                                            setPropostaAlunos([]);
                                        }}
                                    />
                                </label>

                                <div className="resultados-ee-proposta">
                                    {loadingEncarregados && <div className="resultado-ee-status">A procurar...</div>}
                                    {erroPesquisaEE && <div className="resultado-ee-status erro">{erroPesquisaEE}</div>}
                                    {!loadingEncarregados && !erroPesquisaEE && pesquisaEE.trim() && encarregados.length === 0 && (
                                        <div className="resultado-ee-status">Sem resultados para "{pesquisaEE}".</div>
                                    )}
                                    {!loadingEncarregados && encarregados.length > 0 && (
                                        <div className="resultado-ee-lista">
                                            {encarregados.map((encarregado) => (
                                                <button
                                                    key={encarregado.idEncEducacao}
                                                    type="button"
                                                    className={`resultado-ee-item ${propostaEE === encarregado.idEncEducacao ? 'selecionado' : ''}`}
                                                    onClick={() => selecionarEncarregadoProposta(encarregado)}
                                                >
                                                    <strong>{encarregado.nome}</strong>
                                                    <span>
                                                        {encarregado.email || 'Sem email'} - {encarregado.alunos.length} aluno{encarregado.alunos.length === 1 ? '' : 's'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <label>
                                    Enc. educação
                                    <select
                                        className="input-campo"
                                        value={propostaEE ?? ''}
                                        onChange={(event) => {
                                            setPropostaEE(event.target.value ? Number(event.target.value) : null);
                                            setPropostaAlunos([]);
                                        }}
                                    >
                                        <option value="">Selecione</option>
                                        {encarregados.map((encarregado) => (
                                            <option key={encarregado.idEncEducacao} value={encarregado.idEncEducacao}>
                                                {encarregado.nome}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Modalidade
                                    <SelectBoxComponent
                                        id="proposta-modalidade-prof"
                                        selectedOption={propostaModalidade?.toString() || ''}
                                        onChange={(event) => setPropostaModalidade(event.target.value ? Number(event.target.value) : null)}
                                        options={[
                                            { value: '', label: 'Selecione' },
                                            ...modalidadesProposta.map((modalidade) => ({
                                                value: modalidade.idModalidade.toString(),
                                                label: modalidade.descricao,
                                            })),
                                        ]}
                                    />
                                </label>

                                <label>
                                    Data
                                    <input className="input-campo" type="date" value={propostaData} onChange={(event) => setPropostaData(event.target.value)} />
                                </label>

                                <label>
                                    Hora
                                    <input className="input-campo" type="time" value={propostaHora} onChange={(event) => setPropostaHora(event.target.value)} />
                                </label>

                                <label>
                                    Duração (min)
                                    <input className="input-campo" type="number" min={15} step={15} value={propostaDuracao} onChange={(event) => setPropostaDuracao(Number(event.target.value))} />
                                </label>
                            </div>

                            <div className="alunos-proposta-bloco">
                                <span>Alunos associados</span>
                                <div className="alunos-check-list">
                                    {(encarregadoSelecionado?.alunos ?? []).map((aluno) => (
                                        <label key={aluno.idAluno} className="aluno-check-item">
                                            <input
                                                type="checkbox"
                                                checked={propostaAlunos.includes(aluno.idAluno)}
                                                onChange={() => toggleAlunoProposta(aluno.idAluno)}
                                            />
                                            <span>{aluno.nome}</span>
                                        </label>
                                    ))}
                                    {!encarregadoSelecionado && <div className="empty-state">Pesquisa e seleciona um encarregado.</div>}
                                    {encarregadoSelecionado && encarregadoSelecionado.alunos.length === 0 && <div className="empty-state">Sem alunos associados.</div>}
                                </div>
                            </div>

                            <label className="mensagem-proposta">
                                Mensagem (opcional)
                                <textarea
                                    className="input-campo"
                                    rows={3}
                                    value={propostaMensagem}
                                    onChange={(event) => setPropostaMensagem(event.target.value)}
                                    maxLength={255}
                                />
                            </label>
                        </div>

                        <div className="modal-footer">
                            <ButtonComponent type="button" className="btn-secundario" onClick={fecharPropostaModal}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent type="button" className="btn-primario" onClick={handleCriarProposta} disabled={isSubmittingProposta}>
                                {isSubmittingProposta ? 'A enviar...' : 'Enviar proposta'}
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
