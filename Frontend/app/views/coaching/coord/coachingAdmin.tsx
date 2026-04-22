import React, { useState, useEffect } from 'react';
import { AuthService } from '~/services/auth.service';
import { AdminService } from '~/services/admin.service';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import './coachingAdmin.scss'; // Podes reaproveitar o CSS do dashboard para os cards!

// Tipagens (Ajusta consoante os dados que vêm da tua base de dados)
interface AlunoSessao {
    idAluno: number;
    nome: string;
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
    // const coachingService = new CoachingService();
    const adminService = new AdminService();

    // Estados
    const [sessoes, setSessoes] = useState<SessaoAdmin[]>([]);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoAdmin | null>(null);

    // Estados para os Cards (KPIs)
    const [kpis, setKpis] = useState({
        proximas24h: 0,
        marcadas: 0,
        porValidar: 0,
        realizadasMes: 0
    });

    // Buscar dados à API
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
            // Fallback para dados falsos em caso de erro
            setKpis({ proximas24h: 0, marcadas: 0, porValidar: 0, realizadasMes: 0 });
            setSessoes([]);
        }
    }

    useEffect(() => {
        fetchDadosDashboard();
    }, []);

    // Preparar dados para a tabela
    const tableData = sessoes.map(sessao => ({
        ...sessao,
        numAlunos: sessao.alunos.length // Coluna extra para ver rapidamente quantos inscritos tem
    }));

    // Ações do Modal
    function abrirModal(sessao: SessaoAdmin) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }

    // Lógica para Remover Aluno (E apagar sessão se ficar a 0)
    async function handleRemoverAluno(idAluno: number) {
        if (!sessaoSelecionada) return;

        if (window.confirm('Tem a certeza que deseja remover este aluno da sessão?')) {
            try {
                await adminService.removerAluno(idAluno, sessaoSelecionada.idCoaching);

                // Verificar se era o último aluno
                if (sessaoSelecionada.alunos.length === 1) {
                    alert('Aluno removido. A sessão ficou sem alunos e foi apagada do sistema.');
                    fecharModal();
                    fetchDadosDashboard(); // Recarregar tabela
                } else {
                    alert('Aluno removido com sucesso.');
                    const novaListaAlunos = sessaoSelecionada.alunos.filter(a => a.idAluno !== idAluno);
                    setSessaoSelecionada({ ...sessaoSelecionada, alunos: novaListaAlunos });

                    // Recarregar os dados para atualizar a tabela por trás
                    fetchDadosDashboard();
                }
            } catch (error) {
                alert('Erro ao remover aluno.');
            }
        }
    }

    return (
        <div className="dashboard-wrapper">

            {/* CABEÇALHO */}
            <div className="dashboard-boas-vindas">
                <div>
                    <h1>Gestão de Coaching</h1>
                    <p>Controle todas as sessões e inscrições ativas.</p>
                </div>
            </div>

            {/* CARDS (KPIs) */}
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


            {/* MODAL DE DETALHES E GESTÃO DE ALUNOS */}
            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <button className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
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
                                    <button
                                        onClick={() => handleRemoverAluno(aluno.idAluno)}
                                        style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <i className="fa-solid fa-trash-can"></i> Remover
                                    </button>
                                </div>
                            ))}
                            {sessaoSelecionada.alunos.length === 0 && (
                                <p style={{ padding: '12px', color: '#777' }}>Sem alunos inscritos.</p>
                            )}
                        </div>

                        <div className="modal-acoes" style={{ marginTop: '24px' }}>
                            <button className="btn-fechar" onClick={fecharModal}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}