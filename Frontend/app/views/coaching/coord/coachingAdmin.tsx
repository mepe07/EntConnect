import { ButtonComponent } from '~/components/button/button.component';
import React, { useState, useEffect } from 'react';
import { AuthService } from '~/services/auth.service';
import { AdminService } from '~/services/admin.service';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import './coachingAdmin.scss';


import { showToast } from '~/components/toast/toast';
interface AlunoSessao {
    idAluno: number;
    nome: string;
}

interface EncarregadoInfo {
    nome: string;
    email: string | null;
    contacto: string | null;
}

interface AlunoDetalhes {
    idAluno: number;
    nome: string;
    dataNascimento: string | null;
    nif: string;
    email: string | null;
    contacto: string | null;
    menorIdade: boolean;
    encarregado: EncarregadoInfo | null;
}

interface SessaoAdmin {
    idCoaching: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    alunos: AlunoSessao[];
}

export default function CoachingAdmin() {
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();

    const adminService = new AdminService();


    const [sessoes, setSessoes] = useState<SessaoAdmin[]>([]);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoAdmin | null>(null);
    const [isAlunoInfoModalAberto, setIsAlunoInfoModalAberto] = useState(false);
    const [alunoDetalhes, setAlunoDetalhes] = useState<AlunoDetalhes | null>(null);
    const [isCarregandoAluno, setIsCarregandoAluno] = useState(false);


    const [kpis, setKpis] = useState({
        proximas24h: 0,
        marcadas: 0,
        porValidar: 0,
        realizadasMes: 0
    });


    async function fetchDadosDashboard() {
        try {
            const [dadosKpis, dadosTabela] = await Promise.all([
                adminService.getKpis(),
                adminService.getSessoesFuturas()
            ]);

            setKpis(dadosKpis);
            setSessoes(dadosTabela);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);

            setKpis({ proximas24h: 0, marcadas: 0, porValidar: 0, realizadasMes: 0 });
            setSessoes([]);
        }
    }

    useEffect(() => {
        fetchDadosDashboard();
    }, []);


    const tableData = sessoes.map(sessao => ({
        ...sessao,
        numAlunos: sessao.alunos.length
    }));


    function abrirModal(sessao: SessaoAdmin) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }


    async function handleEliminarSessao() {
        if (!sessaoSelecionada) return;

        for (const aluno of sessaoSelecionada.alunos) {
            await adminService.removerAluno(aluno.idAluno, sessaoSelecionada.idCoaching);
        }
        fecharModal();
        fetchDadosDashboard();
    }


    async function handleRemoverAluno(idAluno: number) {
        if (!sessaoSelecionada) return;

        if (window.confirm('Tem a certeza que deseja remover este aluno da sessão?')) {
            try {
                await adminService.removerAluno(idAluno, sessaoSelecionada.idCoaching);


                if (sessaoSelecionada.alunos.length === 1) {
                    showToast('Aluno removido. A sessão ficou sem alunos e foi apagada do sistema.');
                    fecharModal();
                    fetchDadosDashboard();
                } else {
                    showToast('Aluno removido com sucesso.');
                    const novaListaAlunos = sessaoSelecionada.alunos.filter(a => a.idAluno !== idAluno);
                    setSessaoSelecionada({ ...sessaoSelecionada, alunos: novaListaAlunos });


                    fetchDadosDashboard();
                }
            } catch (error) {
                showToast('Erro ao remover aluno.');
            }
        }
    }

    async function abrirModalAluno(aluno: AlunoSessao) {
        setIsCarregandoAluno(true);
        try {
            const detalhes = await adminService.getAlunoDetalhes(aluno.idAluno);
            setAlunoDetalhes(detalhes);
            setIsAlunoInfoModalAberto(true);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar detalhes do aluno.');
        } finally {
            setIsCarregandoAluno(false);
        }
    }

    function fecharModalAluno() {
        setIsAlunoInfoModalAberto(false);
        setAlunoDetalhes(null);
    }

    return (
        <div className="dashboard-wrapper">


            <div className="dashboard-boas-vindas">
                <div>
                    <h1>Gestão de Coaching</h1>
                    <p>Controle todas as sessões e inscrições ativas.</p>
                </div>
            </div>


            <section className="kpi-grid">
                <div className="kpi-card">
                    <div className="icone azul"><i className="fa-solid fa-clock-rotate-left"></i></div>
                    <div className="info">
                        <span>Próximas 24h</span>
                        <h3>{kpis.proximas24h}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone verde"><i className="fa-solid fa-calendar-check"></i></div>
                    <div className="info">
                        <span>Sessões Marcadas</span>
                        <h3>{kpis.marcadas}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone amarelo" style={{ color: '#d97706', backgroundColor: '#fef3c7' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div className="info">
                        <span>Terminadas por validar</span>
                        <h3>{kpis.porValidar}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone roxo"><i className="fa-solid fa-clipboard-check"></i></div>
                    <div className="info">
                        <span>Realizadas (Mês)</span>
                        <h3>{kpis.realizadasMes}</h3>
                    </div>
                </div>
            </section>

            <TableComponent
                config={{
                    columns: [
                        { key: 'nomeProfessor', value: 'Professor', type: TableColumnTypesEnum.Default },
                        { key: 'data', value: 'Data', type: TableColumnTypesEnum.Default },
                        { key: 'horario', value: 'Horário', type: TableColumnTypesEnum.Default },
                        { key: 'modalidade', value: 'Modalidade', type: TableColumnTypesEnum.Default },
                        { key: 'numAlunos', value: 'Nº Alunos Inscritos', type: TableColumnTypesEnum.Default }
                    ],
                    actions: [
                        {
                            icon: 'fa-solid fa-eye',
                            tooltip: 'Ver Detalhes / Gerir Alunos',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => abrirModal(row)
                        }
                    ]
                }}
                data={tableData}
            />


            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid" style={{ marginBottom: '24px' }}>
                            <div className="detalhe-item"><span>Professor</span><strong>{sessaoSelecionada.nomeProfessor}</strong></div>
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{sessaoSelecionada.data} | {sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        <h3>Alunos Inscritos ({sessaoSelecionada.alunos.length})</h3>
                        <div className="lista-alunos-modal" style={{ marginTop: '12px', border: '1px solid #eee', borderRadius: '8px', padding: '8px' }}>
                            {sessaoSelecionada.alunos.map(aluno => (
                                <div key={aluno.idAluno} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #eee' }}>
                                    <span>{aluno.nome}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <ButtonComponent
                                            onClick={() => abrirModalAluno(aluno)}
                                            disabled={isCarregandoAluno}
                                            style={{
                                                background: 'none',
                                                border: '1px solid #007bff',
                                                color: '#007bff',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            <i className="fa-solid fa-info-circle"></i> Ver Info
                                        </ButtonComponent>
                                        <ButtonComponent
                                            onClick={() => handleRemoverAluno(aluno.idAluno)}
                                            style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <i className="fa-solid fa-trash-can"></i> Remover
                                        </ButtonComponent>
                                    </div>
                                </div>
                            ))}
                            {sessaoSelecionada.alunos.length === 0 && (
                                <p style={{ padding: '12px', color: '#777' }}>Sem alunos inscritos.</p>
                            )}
                        </div>

                        <div className="modal-acoes" style={{ marginTop: '24px' }}>
                            <ButtonComponent className="btn-anularSessao" onClick={handleEliminarSessao}>Anular sessão</ButtonComponent>
                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>Fechar</ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {isAlunoInfoModalAberto && alunoDetalhes && (
                <div className="modal-overlay" style={{ zIndex: 10001 }}>
                    <div className="modal-conteudo" style={{ maxWidth: '520px', position: 'relative', zIndex: 10002 }}>
                        <div className="modal-cabecalho">
                            <h2>Informação do Aluno</h2>
                            <ButtonComponent className="btn-fechar-icon" onClick={fecharModalAluno}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="detalhes-grid" style={{ marginBottom: '20px' }}>
                            <div className="detalhe-item"><span>Nome</span><strong>{alunoDetalhes.nome}</strong></div>
                            <div className="detalhe-item"><span>Data de Nascimento</span><strong>{alunoDetalhes.dataNascimento || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>NIF</span><strong>{alunoDetalhes.nif}</strong></div>
                            <div className="detalhe-item"><span>Email</span><strong>{alunoDetalhes.email || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Contacto</span><strong>{alunoDetalhes.contacto || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Menor de idade</span><strong>{alunoDetalhes.menorIdade ? 'Sim' : 'Não'}</strong></div>
                        </div>

                        <h3>Encarregado de Educação</h3>
                        <div className="detalhes-grid" style={{ marginTop: '12px' }}>
                            <div className="detalhe-item"><span>Nome</span><strong>{alunoDetalhes.encarregado?.nome || 'Sem encarregado'}</strong></div>
                            <div className="detalhe-item"><span>Email</span><strong>{alunoDetalhes.encarregado?.email || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span>Contacto</span><strong>{alunoDetalhes.encarregado?.contacto || 'N/A'}</strong></div>
                        </div>

                        <div className="modal-acoes" style={{ marginTop: '24px' }}>
                            <ButtonComponent className="btn-fechar" onClick={fecharModalAluno}>Fechar</ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}