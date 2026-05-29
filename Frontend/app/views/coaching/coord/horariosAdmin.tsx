import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useState } from 'react';
import { modalidadesService } from '~/services/modalidades.service';
import { salasService } from '~/services/salas.service';
import { UtilizadorService } from '~/services/users.service';
import { horariosService } from '~/services/horarios.service';
import './horariosAdmin.scss';

interface DiaSemana {
    ID_Dia: number;
    Nome_Dia: string;
}

interface Modalidade {
    ID_Modalidade: number;
    Descricao: string;
}

interface Sala {
    ID_Sala: number;
    Nome: string;
}

interface UtilizadorProf {
    idUtilizador: number;
    nome: string;
    username: string;
    cargo: string;
    ativo: boolean;
}

interface Excecao {
    ID_Excecao: number;
    Data_Cancelada: string;
}

interface HorarioFixo {
    ID_AulaFixa: number;
    Dia_Semana: number;
    Hora_Inicio: string;
    Duracao: number;
    ID_Estudio: number;
    ID_Modalidade: number;
    ID_Professor?: number | null;
    Descricao?: string | null;
    Ativa: boolean;
    Sala?: Sala;
    Modalidade?: Modalidade;
    Utilizador?: { Pessoa?: { Nome: string }; Utilizador?: string };
    Dias_Semana?: DiaSemana;
    Excecao_Aula_Fixa?: Excecao[];
}

const initialForm = {
    diaSemana: 1,
    horaInicio: '09:00',
    duracao: 60,
    idEstudio: 0,
    idModalidade: 0,
    idProfessor: 0,
    descricao: '',
    ativa: true,
};

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


const HORA_INICIO_CALENDARIO = 6;
const MINUTOS_INICIO_CALENDARIO = HORA_INICIO_CALENDARIO * 60;
const HORAS_DIA = Array.from({ length: 24 - HORA_INICIO_CALENDARIO }, (_, i) => i + HORA_INICIO_CALENDARIO);
const ALTURA_CALENDARIO = HORAS_DIA.length * 60;

export default function HorariosAdmin() {
    const [horarios, setHorarios] = useState<HorarioFixo[]>([]);
    const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
    const [salas, setSalas] = useState<Sala[]>([]);
    const [modalidades, setModalidades] = useState<Modalidade[]>([]);
    const [professores, setProfessores] = useState<UtilizadorProf[]>([]);


    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedHorario, setSelectedHorario] = useState<HorarioFixo | null>(null);
    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);

    const [form, setForm] = useState<typeof initialForm>(initialForm);
    const [exceptionDate, setExceptionDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const utilizadorService = new UtilizadorService();

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setError(null);
            try {
                const [horariosData, diasData, salasData, modalidadesData, utilizadoresData] = await Promise.all([
                    horariosService.getHorarios(),
                    horariosService.getDiasSemana(),
                    salasService.getSalas(),
                    modalidadesService.getModalidades(),
                    utilizadorService.getUsers(),
                ]);

                const professoresComConta = utilizadoresData.filter(
                    (u: UtilizadorProf) => u.cargo === 'Professor' && u.ativo
                );

                setHorarios(horariosData);
                setDiasSemana(diasData);
                setSalas(salasData);
                setModalidades(modalidadesData);
                setProfessores(professoresComConta);
            } catch (erro) {
                setError(erro instanceof Error ? erro.message : 'Não foi possível carregar os dados.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const refreshHorarios = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await horariosService.getHorarios();
            setHorarios(data);
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao carregar horários.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!form.idEstudio || !form.idModalidade) {
            setError('Escolha um estúdio e uma modalidade antes de guardar.');
            setLoading(false);
            return;
        }

        try {
            await horariosService.createHorario({
                diaSemana: form.diaSemana,
                horaInicio: form.horaInicio,
                duracao: form.duracao,
                idEstudio: form.idEstudio,
                idModalidade: form.idModalidade,
                idProfessor: form.idProfessor || undefined,
                descricao: form.descricao || undefined,
                ativa: form.ativa,
            });
            setSuccess('Horário fixo criado com sucesso.');
            setForm(initialForm);
            setIsCreateModalOpen(false);
            await refreshHorarios();


            setTimeout(() => setSuccess(null), 3000);
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao criar horário.');
        } finally {
            setLoading(false);
        }
    };


    const calcularPosicaoY = (horaInico: string) => {
        const date = new Date(horaInico);
        if (Number.isNaN(date.getTime())) return 0;
        const horas = date.getHours();
        const minutos = date.getMinutes();
        return (horas * 60) + minutos - MINUTOS_INICIO_CALENDARIO;
    };


    const processarAulasDoDia = (idDia: number) => {
        const aulasDoDia = horarios.filter(h => h.Dia_Semana === idDia);


        const aulasFormatadas = aulasDoDia.map(a => ({
            ...a,
            top: calcularPosicaoY(a.Hora_Inicio),
            bottom: calcularPosicaoY(a.Hora_Inicio) + a.Duracao,
            coluna: 0,
        })).sort((a, b) => a.top - b.top);


        const faixas: typeof aulasFormatadas[] = [];

        aulasFormatadas.forEach(aula => {
            let colocada = false;
            for (let i = 0; i < faixas.length; i++) {
                const ultimaAula = faixas[i][faixas[i].length - 1];

                if (aula.top >= ultimaAula.bottom) {
                    faixas[i].push(aula);
                    aula.coluna = i;
                    colocada = true;
                    break;
                }
            }

            if (!colocada) {
                faixas.push([aula]);
                aula.coluna = faixas.length - 1;
            }
        });


        const maxColunas = faixas.length || 1;


        return aulasFormatadas.map(aula => ({
            ...aula,
            width: `calc(${100 / maxColunas}% - 4px)`,
            left: `calc(${aula.coluna * (100 / maxColunas)}% + 2px)`,
        }));
    };


    const openHorarioModal = (horario: HorarioFixo) => {
        setSelectedHorario(horario);
        setExceptionDate('');
        setIsExceptionModalOpen(false);
        setSuccess(null);
        setError(null);
    };

    const closeModal = () => {
        setSelectedHorario(null);
        setExceptionDate('');
        setIsExceptionModalOpen(false);
    };

    const openExceptionModal = () => {
        setExceptionDate('');
        setIsExceptionModalOpen(true);
        setError(null);
        setSuccess(null);
    };

    const closeExceptionModal = () => {
        setIsExceptionModalOpen(false);
        setExceptionDate('');
    };

    const handleCreateException = async () => {
        if (!selectedHorario) return;
        if (!exceptionDate) {
            setError('Escolha uma data para a exceção.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await horariosService.createExcecao(selectedHorario.ID_AulaFixa, {
                dataCancelada: exceptionDate,
            });
            setSuccess('Exceção criada com sucesso.');
            const updated = (await horariosService.getHorarios()) as HorarioFixo[];
            setHorarios(updated);
            const refreshed = updated.find((item: HorarioFixo) => item.ID_AulaFixa === selectedHorario.ID_AulaFixa) ?? null;
            setSelectedHorario(refreshed);
            setExceptionDate('');
            setIsExceptionModalOpen(false);
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao criar exceção.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAtiva = async (horario: HorarioFixo) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await horariosService.updateHorario(horario.ID_AulaFixa, { ativa: !horario.Ativa });
            setSuccess(horario.Ativa ? 'Horário desativado com sucesso.' : 'Horário ativado com sucesso.');
            await refreshHorarios();
            const refreshed = horarios.find((item) => item.ID_AulaFixa === horario.ID_AulaFixa);
            if(refreshed) setSelectedHorario({...refreshed, Ativa: !horario.Ativa});
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao atualizar o horário.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHorario = async (idAulaFixa: number) => {
        const confirmacao = window.confirm(
            'Tem a certeza que deseja eliminar esta aula fixa? Todas as exceções/cancelamentos associados também serão apagados.\n\nEsta ação não pode ser desfeita.'
        );

        if (!confirmacao) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await horariosService.deleteHorario(idAulaFixa);
            setSuccess('Aula fixa eliminada com sucesso.');
            closeModal();
            await refreshHorarios();

            setTimeout(() => setSuccess(null), 3000);
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao eliminar a aula.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteException = async (idExcecao: number) => {
        const confirmacao = window.confirm('Deseja remover esta exceção? A aula voltará a estar ativa neste dia.');
        if (!confirmacao) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await horariosService.deleteExcecao(idExcecao);
            setSuccess('Exceção removida com sucesso.');


            const updated = (await horariosService.getHorarios()) as HorarioFixo[];
            setHorarios(updated);

            if (selectedHorario) {
                const refreshed = updated.find((item) => item.ID_AulaFixa === selectedHorario.ID_AulaFixa) ?? null;
                setSelectedHorario(refreshed);
            }

            setTimeout(() => setSuccess(null), 3000);
        } catch (erro) {
            setError(erro instanceof Error ? erro.message : 'Erro ao remover exceção.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="horarios-admin">

            <div className="page-header">
                <div>
                    <h1>Horários Fixos</h1>
                    <p>Faça a gestão da grelha de aulas recorrentes do estúdio.</p>
                </div>
                <ButtonComponent className="btn-primario" onClick={() => setIsCreateModalOpen(true)}>
                    <i className="fa-solid fa-plus"></i> Criar Nova Aula
                </ButtonComponent>
            </div>

            {(error || success) && (
                <div className={`status-message ${error ? 'status-error' : 'status-success'}`}>
                    {error || success}
                </div>
            )}


            <div className="calendario-card">
                {loading && horarios.length === 0 ? (
                    <div className="tabela-loading"><i className="fa-solid fa-spinner fa-spin"></i> A carregar grelha...</div>
                ) : (
                    <div className="calendario-wrapper">

                        <div className="calendario-canto-vazio">
                            <i className="fa-regular fa-clock"></i>
                        </div>


                        <div className="calendario-header-dias">
                            {diasSemana.map(dia => (
                                <div key={dia.ID_Dia} className="dia-header-item">
                                    {dia.Nome_Dia}
                                </div>
                            ))}
                        </div>


                        <div className="calendario-eixo-horas">
                            {HORAS_DIA.map(hora => (
                                <div key={hora} className="hora-slot">
                                    <span>{hora.toString().padStart(2, '0')}:00</span>
                                </div>
                            ))}
                        </div>


                        <div className="calendario-grelha" style={{ height: `${ALTURA_CALENDARIO}px` }}>

                            <div className="grelha-linhas-fundo">
                                {HORAS_DIA.map(hora => (
                                    <div key={`linha-${hora}`} className="linha-hora"></div>
                                ))}
                            </div>


                            <div className="colunas-wrapper">
                                {diasSemana.map(dia => (
                                    <div key={dia.ID_Dia} className="coluna-dia">
                                        {processarAulasDoDia(dia.ID_Dia).map(aula => (
                                            <div
                                                key={aula.ID_AulaFixa}
                                                className={`aula-card ${!aula.Ativa ? 'inativa' : ''}`}
                                                style={{
                                                    top: `${aula.top}px`,
                                                    height: `${aula.Duracao}px`,
                                                    width: aula.width,
                                                    left: aula.left,
                                                }}
                                                onClick={() => openHorarioModal(aula)}
                                            >
                                                <div className="aula-titulo">{aula.Modalidade?.Descricao}</div>
                                                <div className="aula-info">
                                                    {formatTime(aula.Hora_Inicio)} - {aula.Sala?.Nome}
                                                </div>
                                                {aula.Utilizador?.Pessoa?.Nome && (
                                                    <div className="aula-prof">
                                                        <i className="fa-solid fa-user-tie"></i> {aula.Utilizador.Pessoa.Nome.split(' ')[0]}
                                                    </div>
                                                )}
                                            </div>
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
                            <h3>Adicionar Aula Fixa</h3>
                            <ButtonComponent className="btn-fechar" onClick={() => setIsCreateModalOpen(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleSubmit} id="form-criar-aula">
                                <div className="form-grid">
                                    <label>
                                        Dia da semana
                                        <select
                                            className="input-campo"
                                            value={form.diaSemana}
                                            onChange={(event) => setForm({ ...form, diaSemana: Number(event.target.value) })}
                                        >
                                            {diasSemana.map((dia) => (
                                                <option key={dia.ID_Dia} value={dia.ID_Dia}>
                                                    {dia.Nome_Dia}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Hora de início
                                        <input
                                            type="time"
                                            className="input-campo"
                                            value={form.horaInicio}
                                            onChange={(event) => setForm({ ...form, horaInicio: event.target.value })}
                                            required
                                        />
                                    </label>

                                    <label>
                                        Duração (min)
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
                                        Estúdio
                                        <select
                                            className="input-campo"
                                            value={form.idEstudio}
                                            onChange={(event) => setForm({ ...form, idEstudio: Number(event.target.value) })}
                                            required
                                        >
                                            <option value={0}>Selecione um estúdio</option>
                                            {salas.map((sala) => (
                                                <option key={sala.ID_Sala} value={sala.ID_Sala}>
                                                    {sala.Nome}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Modalidade
                                        <select
                                            className="input-campo"
                                            value={form.idModalidade}
                                            onChange={(event) => setForm({ ...form, idModalidade: Number(event.target.value) })}
                                            required
                                        >
                                            <option value={0}>Selecione uma modalidade</option>
                                            {modalidades.map((modalidade) => (
                                                <option key={modalidade.ID_Modalidade} value={modalidade.ID_Modalidade}>
                                                    {modalidade.Descricao}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Professor (opcional)
                                        <select
                                            className="input-campo"
                                            value={form.idProfessor}
                                            onChange={(event) => setForm({ ...form, idProfessor: Number(event.target.value) })}
                                        >
                                            <option value={0}>Sem professor definido</option>
                                            {professores.map((prof) => (
                                                <option key={prof.idUtilizador} value={prof.idUtilizador}>
                                                    {prof.nome} ({prof.username})
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="full-width">
                                        Descrição
                                        <input
                                            type="text"
                                            className="input-campo"
                                            value={form.descricao}
                                            placeholder="Ex: Turma nível avançado..."
                                            onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                                        />
                                    </label>

                                    <label className="full-width checkbox-row">
                                        <input
                                            type="checkbox"
                                            checked={form.ativa}
                                            onChange={(event) => setForm({ ...form, ativa: event.target.checked })}
                                        />
                                        <span>Ativa (Aparece na grelha oficial)</span>
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <ButtonComponent type="button" className="btn-secundario" onClick={() => setIsCreateModalOpen(false)}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent type="submit" form="form-criar-aula" className="btn-primario" disabled={loading}>
                                {loading
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A gravar...</>
                                    : <><i className="fa-solid fa-check"></i> Gravar Aula Fixa</>
                                }
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}


            {selectedHorario && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content detalhes-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{margin:0}}>Detalhes da Aula</h3>
                                <span style={{fontSize: '13px', color: '#6b7280'}}>
                                    {selectedHorario.Dias_Semana?.Nome_Dia} às {formatTime(selectedHorario.Hora_Inicio)}
                                </span>
                            </div>
                            <ButtonComponent className="btn-fechar" onClick={closeModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <div className="modal-row">
                                <span>Modalidade</span>
                                <strong>{selectedHorario.Modalidade?.Descricao}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Duração</span>
                                <strong>{selectedHorario.Duracao} minutos</strong>
                            </div>
                            <div className="modal-row">
                                <span>Estúdio</span>
                                <strong>{selectedHorario.Sala?.Nome}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Professor</span>
                                <strong>{selectedHorario.Utilizador?.Pessoa?.Nome || 'Não definido'}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Descrição</span>
                                <strong>{selectedHorario.Descricao || '—'}</strong>
                            </div>
                            <div className="modal-row">
                                <span>Estado da Grelha</span>
                                <strong>
                                    {selectedHorario.Ativa
                                        ? <span style={{color: '#16a34a'}}><i className="fa-solid fa-circle-check"></i> Ativa</span>
                                        : <span style={{color: '#dc2626'}}><i className="fa-solid fa-circle-xmark"></i> Suspensa</span>
                                    }
                                </strong>
                            </div>

                            <div className="modal-divider" />

                            <div className="modal-row">
                                <span>Exceções ativas (Cancelamentos)</span>
                                <strong>{selectedHorario.Excecao_Aula_Fixa?.length ?? 0}</strong>
                            </div>

                            {selectedHorario.Excecao_Aula_Fixa?.length ? (
                                <ul className="exception-list">
                                    {selectedHorario.Excecao_Aula_Fixa.map((excecao) => (
                                        <li
                                            key={excecao.ID_Excecao}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <span>
                                                <i className="fa-regular fa-calendar-xmark" style={{ marginRight: '8px', color: '#dc2626' }}></i>
                                                {formatDate(excecao.Data_Cancelada)}
                                            </span>

                                            <ButtonComponent
                                                type="button"
                                                onClick={() => handleDeleteException(excecao.ID_Excecao)}
                                                disabled={loading}
                                                title="Remover cancelamento"
                                                style={{
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    color: '#dc2626', fontSize: '14px', padding: '4px', opacity: loading ? 0.5 : 1
                                                }}
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </ButtonComponent>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state" style={{padding: '16px'}}>Sem cancelamentos registados.</div>
                            )}

                            {!isExceptionModalOpen ? (
                                <ButtonComponent type="button" className="btn-secundario" style={{width: '100%', marginTop: '10px'}} onClick={openExceptionModal}>
                                    <i className="fa-solid fa-plus"></i> Adicionar Exceção
                                </ButtonComponent>
                            ) : (
                                <div className="excecao-form-inline">
                                     <form onSubmit={async (e) => { e.preventDefault(); await handleCreateException(); }}>
                                        <div className="form-group">
                                            <label>Data a cancelar</label>
                                            <input type="date" className="input-campo" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} required />
                                        </div>
                                        <div style={{display: 'flex', gap: '8px', marginTop: '10px'}}>
                                            <ButtonComponent type="submit" className="btn-primario" style={{flex: 1}} disabled={loading}>
                                                Confirmar
                                            </ButtonComponent>
                                            <ButtonComponent type="button" className="btn-secundario" onClick={closeExceptionModal}>
                                                Cancelar
                                            </ButtonComponent>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>

                        <div className="modal-footer">
                            <ButtonComponent
                                type="button"
                                className={`btn-secundario ${selectedHorario.Ativa ? 'btn-perigo' : 'btn-sucesso'}`}
                                style={{ flex: 1 }}
                                onClick={() => handleToggleAtiva(selectedHorario)}
                                disabled={loading}
                            >
                                {selectedHorario.Ativa
                                    ? <><i className="fa-solid fa-pause"></i> Suspender</>
                                    : <><i className="fa-solid fa-play"></i> Reativar</>
                                }
                            </ButtonComponent>

                            <ButtonComponent
                                type="button"
                                className="btn-secundario btn-perigo"
                                style={{ flex: 1 }}
                                onClick={() => handleDeleteHorario(selectedHorario.ID_AulaFixa)}
                                disabled={loading}
                                title="Eliminar permanentemente"
                            >
                                <i className="fa-solid fa-trash"></i> Eliminar
                            </ButtonComponent>

                            <ButtonComponent
                                type="button"
                                className="btn-primario"
                                style={{ flex: 1 }}
                                onClick={closeModal}
                            >
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
