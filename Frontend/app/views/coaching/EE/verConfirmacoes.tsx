import { ButtonComponent } from '~/components/button/button.component';
import './verMarcacoes.scss';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '~/services/auth.service';
import { RolesService } from '~/services/roles.service';
import { EEService } from '~/services/EE.service';
import type { User } from '~/models/interfaces/user.interface';
import { showToast } from '~/components/toast/toast';

interface SessaoConfirmacao {
    idCoaching: number;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    professor: string;
    alunos: string;
}

function normalizarTexto(valor: string) {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function parseDataHora(data: string, horario: string) {
    const [dia, mes, ano] = data.split('/').map(Number);
    const [horaInicio = '00:00'] = horario.split(' - ');
    const [hora, minuto] = horaInicio.split(':').map(Number);
    return new Date(ano, mes - 1, dia, hora || 0, minuto || 0);
}

export default function VerConfirmacoesEE() {
    const userInfo = authService.getUserInfo() as User;
    const isEncEducacao = userInfo?.role === 'Enc_Educacao';
    const eeService = new EEService();
    const rolesService = new RolesService();

    const [confirmacoes, setConfirmacoes] = useState<any[]>([]);
    const [idEE, setIdEE] = useState<number | null>(null);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoConfirmacao | null>(null);
    const [isAguardar, setIsAguardar] = useState(false);
    const [pesquisa, setPesquisa] = useState('');

    async function fetchConfirmacoes() {
        try {
            if (!userInfo?.sub) return;

            const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo.sub);
            if (!respostaRoles?.idEncEducacao) return;

            setIdEE(respostaRoles.idEncEducacao);
            const data = await eeService.getConfirmacoesByEE(respostaRoles.idEncEducacao);
            setConfirmacoes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao carregar confirmações do EE:', error);
        }
    }

    useEffect(() => {
        if (isEncEducacao) {
            fetchConfirmacoes();
        }
    }, [isEncEducacao]);

    if (!isEncEducacao) {
        return (
            <div className="pagina-agendamentos" style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Acesso Negado</h1>
                <p>Esta área é apenas para Encarregados de Educação.</p>
            </div>
        );
    }

    function abrirModal(sessao: SessaoConfirmacao) {
        setSessaoSelecionada(sessao);
    }

    function fecharModal() {
        setSessaoSelecionada(null);
    }

    async function handleConfirmacao(sessao: SessaoConfirmacao, idEstadoCoaching: number) {
        if (!idEE) return;

        const mensagem = idEstadoCoaching === 13
            ? `Confirma que a sessão de ${sessao.modalidade} foi realizada pelos alunos: ${sessao.alunos}?`
            : 'Indica que esta sessão não aconteceu?';

        if (!window.confirm(mensagem)) return;

        setIsAguardar(true);
        try {
            await eeService.confirmarSessaoEE(idEE, sessao.idCoaching, idEstadoCoaching);
            showToast('Confirmação registada!');

            setConfirmacoes((listaAtual) =>
                listaAtual.filter((item) => item.idCoaching !== sessao.idCoaching)
            );

            fecharModal();
        } catch (error: any) {
            console.error('Erro ao confirmar sessão EE:', error);
            showToast(error.message || 'Erro ao atualizar o estado da sessão.');
        } finally {
            setIsAguardar(false);
        }
    }

    const sessoes = useMemo<SessaoConfirmacao[]>(() => confirmacoes.map((sessao) => ({
        idCoaching: sessao.idCoaching,
        data: sessao.data,
        horario: sessao.horario,
        modalidade: sessao.modalidade,
        estado: sessao.estado,
        professor: sessao.professor,
        alunos: Array.isArray(sessao.alunos) ? sessao.alunos.map((aluno: any) => aluno.nome).join(', ') : 'N/A',
    })), [confirmacoes]);

    const sessoesFiltradas = useMemo(() => {
        const termo = normalizarTexto(pesquisa.trim());

        return sessoes
            .filter((sessao) => {
                if (!termo) return true;

                return normalizarTexto([
                    sessao.data,
                    sessao.horario,
                    sessao.modalidade,
                    sessao.estado,
                    sessao.professor,
                    sessao.alunos,
                ].join(' ')).includes(termo);
            })
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [sessoes, pesquisa]);

    const sessoesPorData = useMemo(() => {
        const grupos = new Map<string, SessaoConfirmacao[]>();

        sessoesFiltradas.forEach((sessao) => {
            const entrada = grupos.get(sessao.data) ?? [];
            entrada.push(sessao);
            grupos.set(sessao.data, entrada);
        });

        return Array.from(grupos.entries()).map(([data, items]) => ({ data, items }));
    }, [sessoesFiltradas]);

    function renderAlunos(alunos: string) {
        return alunos
            .split(',')
            .map((aluno) => aluno.trim())
            .filter(Boolean)
            .map((aluno) => <span key={aluno} className="aluno-chip">{aluno}</span>);
    }

    return (
        <div className="ver-marcacoes-container">
            <div className="cabecalho">
                <div>
                    <h1>Confirmações de Coaching</h1>
                    <p>Confirme se as sessões dos seus educandos foram realizadas ou não.</p>
                </div>
            </div>

            <div className="confirmacoes-toolbar">
                <div className="confirmacoes-search">
                    <label htmlFor="pesquisa-confirmacoes">Pesquisa</label>
                    <input
                        id="pesquisa-confirmacoes"
                        type="search"
                        value={pesquisa}
                        onChange={(event) => setPesquisa(event.target.value)}
                        placeholder="Procurar por aluno, professor, modalidade..."
                    />
                </div>

                <div className="confirmacoes-summary">
                    <strong>{sessoesFiltradas.length}</strong>
                    <span>{sessoesFiltradas.length === 1 ? 'sessão pendente' : 'sessões pendentes'}</span>
                </div>
            </div>

            <div className="confirmacoes-list">
                {sessoesPorData.length === 0 ? (
                    <div className="empty-state">Não existem sessões pendentes de confirmação.</div>
                ) : (
                    sessoesPorData.map((grupo) => (
                        <section key={grupo.data} className="confirmacoes-day-group">
                            <h2>{grupo.data}</h2>
                            <div className="confirmacoes-cards">
                                {grupo.items.map((sessao) => (
                                    <article key={sessao.idCoaching} className="confirmacao-card">
                                        <div className="confirmacao-card-main">
                                            <div className="confirmacao-meta">
                                                <span>{sessao.data}</span>
                                                <span>{sessao.horario}</span>
                                                <span className="estado-badge">{sessao.estado}</span>
                                            </div>
                                            <h3>{sessao.modalidade}</h3>
                                            <p>Prof. {sessao.professor}</p>
                                            <div className="alunos-list" aria-label="Alunos">
                                                {renderAlunos(sessao.alunos)}
                                            </div>
                                        </div>

                                        <div className="confirmacao-actions">
                                            <ButtonComponent
                                                type="button"
                                                className="btn-card-icon"
                                                tooltip="Ver detalhes da sessão"
                                                onClick={() => abrirModal(sessao)}
                                            >
                                                <i className="fa-solid fa-eye" />
                                            </ButtonComponent>
                                            <ButtonComponent
                                                type="button"
                                                className="btn-card-confirmar"
                                                onClick={() => handleConfirmacao(sessao, 13)}
                                                disabled={isAguardar}
                                            >
                                                <i className="fa-solid fa-check" />
                                                Realizada
                                            </ButtonComponent>
                                            <ButtonComponent
                                                type="button"
                                                className="btn-card-rejeitar"
                                                onClick={() => handleConfirmacao(sessao, 14)}
                                                disabled={isAguardar}
                                            >
                                                <i className="fa-solid fa-xmark" />
                                                Não aconteceu
                                            </ButtonComponent>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {sessaoSelecionada && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-conteudo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModal} aria-label="Fechar">
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Data</span><strong>{sessaoSelecionada.data}</strong></div>
                            <div className="detalhe-item"><span>Horário</span><strong>{sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Professor</span><strong>{sessaoSelecionada.professor}</strong></div>
                            <div className="detalhe-item detalhe-item--full"><span>Alunos</span><strong>{sessaoSelecionada.alunos}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-card-confirmar" onClick={() => handleConfirmacao(sessaoSelecionada, 13)} disabled={isAguardar}>
                                Realizada
                            </ButtonComponent>
                            <ButtonComponent className="btn-card-rejeitar" onClick={() => handleConfirmacao(sessaoSelecionada, 14)} disabled={isAguardar}>
                                Não aconteceu
                            </ButtonComponent>
                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {isAguardar && (
                <div className="confirmacoes-loading">
                    A atualizar a confirmação...
                </div>
            )}
        </div>
    );
}
