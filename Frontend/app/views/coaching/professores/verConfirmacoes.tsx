import { ButtonComponent } from '~/components/button/button.component';
import './verAgendamentos.scss';
import type { User } from '~/models/interfaces/user.interface';
import { authService } from '~/services/auth.service';
import { AgendamentosService } from '~/services/agendamentos.service';
import { useEffect, useMemo, useState } from 'react';
import { RolesService } from '~/services/roles.service';
import { showToast } from '~/components/toast/toast';

interface SessaoConfirmacaoProfessor {
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

export default function VerConfirmacoes() {
    const userInfo = authService.getUserInfo() as User;
    const isProfessor = userInfo?.role?.toLowerCase().includes('professor');
    const agendamentosService = new AgendamentosService();
    const rolesService = new RolesService();

    const [confirmacoes, setConfirmacoes] = useState<SessaoConfirmacaoProfessor[]>([]);
    const [idProfessor, setIdProfessor] = useState<number | null>(null);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoConfirmacaoProfessor | null>(null);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [isAguardar, setIsAguardar] = useState(false);
    const [pesquisa, setPesquisa] = useState('');

    async function fetchConfirmacoes() {
        try {
            if (!userInfo || !userInfo.sub) return;

            const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo.sub);
            if (!respostaRoles || !respostaRoles.idProfessor) return;

            setIdProfessor(respostaRoles.idProfessor);
            const data = await agendamentosService.getConfirmacoesProfessor(respostaRoles.idProfessor);
            setConfirmacoes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao carregar confirmações:', error);
        }
    }

    useEffect(() => {
        if (isProfessor) {
            fetchConfirmacoes();
        }
    }, [isProfessor]);

    if (!isProfessor) {
        return (
            <div className="pagina-agendamentos pagina-agendamentos-acesso">
                <h1>Acesso Negado</h1>
                <p>Esta área é apenas para professores.</p>
            </div>
        );
    }

    function abrirModal(sessao: SessaoConfirmacaoProfessor) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }

    async function handleConfirmacao(sessao: SessaoConfirmacaoProfessor, idEstadoCoaching: number) {
        if (!idProfessor) return;

        const mensagem = idEstadoCoaching === 13
            ? 'Confirmar que a sessão foi realizada?'
            : 'Marcar esta sessão como não realizada?';

        if (!window.confirm(mensagem)) return;

        setIsAguardar(true);
        try {
            await agendamentosService.confirmarSessao(idProfessor, sessao.idCoaching, idEstadoCoaching);
            showToast('Estado atualizado com sucesso.');
            fecharModal();
            fetchConfirmacoes();
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar o estado da sessão.');
        } finally {
            setIsAguardar(false);
        }
    }

    const sessoesFiltradas = useMemo(() => {
        const termo = normalizarTexto(pesquisa.trim());

        return confirmacoes
            .filter((sessao) => {
                if (!termo) return true;
                const alunos = (sessao.alunos ?? []).map((aluno) => aluno.nome).join(' ');

                return normalizarTexto([
                    sessao.data,
                    sessao.horario,
                    sessao.modalidade,
                    sessao.estado,
                    alunos,
                ].join(' ')).includes(termo);
            })
            .sort((a, b) => parseDataHora(a.data, a.horario).getTime() - parseDataHora(b.data, b.horario).getTime());
    }, [confirmacoes, pesquisa]);

    const sessoesPorData = useMemo(() => {
        const grupos = new Map<string, SessaoConfirmacaoProfessor[]>();

        sessoesFiltradas.forEach((sessao) => {
            const entrada = grupos.get(sessao.data) ?? [];
            entrada.push(sessao);
            grupos.set(sessao.data, entrada);
        });

        return Array.from(grupos.entries()).map(([data, items]) => ({ data, items }));
    }, [sessoesFiltradas]);

    function renderAlunos(sessao: SessaoConfirmacaoProfessor) {
        const alunos = sessao.alunos ?? [];

        if (alunos.length === 0) {
            return <span className="aluno-chip muted">Sem alunos</span>;
        }

        return alunos.map((aluno) => (
            <span key={aluno.idAluno} className="aluno-chip">{aluno.nome}</span>
        ));
    }

    return (
        <div className="pagina-ver-agendamentos">
            <div className="confirmacoes-header">
                <div>
                    <h1>Confirmações de Coaching</h1>
                    <p>Estas são as sessões já passadas que ainda precisam de confirmação.</p>
                </div>
            </div>

            <div className="confirmacoes-toolbar">
                <div className="confirmacoes-search">
                    <label htmlFor="pesquisa-confirmacoes-professor">Pesquisa</label>
                    <input
                        id="pesquisa-confirmacoes-professor"
                        type="search"
                        value={pesquisa}
                        onChange={(event) => setPesquisa(event.target.value)}
                        placeholder="Procurar por aluno, modalidade, estado..."
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
                                            <div className="alunos-list" aria-label="Alunos">
                                                {renderAlunos(sessao)}
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
                                </div>
                            ))}
                            {(sessaoSelecionada.alunos?.length ?? 0) === 0 && (
                                <p className="empty-modal-list">Sem alunos inscritos.</p>
                            )}
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
