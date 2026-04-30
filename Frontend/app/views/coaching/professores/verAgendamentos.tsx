import './verAgendamentos.scss'
import { TableColumnTypesEnum } from "~/components/table/models/enums/table-column-types.enum";
import { TableComponent } from "~/components/table/table.component";
import type { User } from "~/models/interfaces/user.interface";
import { authService } from "~/services/auth.service";
import { AgendamentosService } from "~/services/agendamentos.service";
import { useEffect, useState } from "react";
import { RolesService } from "~/services/roles.service";
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import { AdminService } from '~/services/admin.service';


export default function VerAgendamentos() {
    const userInfo = authService.getUserInfo() as User;
    const isProfessor = userInfo?.role.toLowerCase().includes('professor');
    const agendamentosService = new AgendamentosService();
    const [agendamentos, setAgendamentos] = useState<any[]>([]);
    const rolesService = new RolesService();
    const adminService = new AdminService();
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<any | null>(null);
    const [isAlunoInfoModalAberto, setIsAlunoInfoModalAberto] = useState(false);
    const [alunoDetalhes, setAlunoDetalhes] = useState<any | null>(null);
    const [isCarregandoAluno, setIsCarregandoAluno] = useState(false);

    async function fetchAgendamentos() {
        try {
            if (!userInfo || !userInfo.sub) {
                console.warn("Utilizador não encontrado ou sem ID.");
                return;
            }

            const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo?.sub);

            if (!respostaRoles) return;

            const idProfessor = respostaRoles.idProfessor;

            if (!idProfessor) return;

            const data = await agendamentosService.getAgendamentosProfessor(idProfessor);

            setAgendamentos(data);
        } catch (error) {
            console.error('Sem agendamentos:', error);
        }
    }

    useEffect(() => {
        if (isProfessor) {
            fetchAgendamentos();
        }

    }, [isProfessor]);

    if (!isProfessor) {
        return (
            <div className="pagina-agendamentos" style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Acesso Negado 🚫</h1>
            </div>
        );
    }


    function abrirModal(sessao: any) {
        setSessaoSelecionada(sessao); // Guarda a linha que foi clicada
        setIsModalAberto(true);       // Abre o modal
    }

    function fecharModal() {
        setIsModalAberto(false);      // Fecha o modal
        setSessaoSelecionada(null);   // Limpa os dados
    }

async function abrirModalAluno(aluno: any) {
        setIsCarregandoAluno(true);
        
        try {
            const detalhes = await adminService.getAlunoDetalhes(aluno.idAluno);
            setAlunoDetalhes(detalhes);
            setIsAlunoInfoModalAberto(true);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar detalhes do aluno. Verifica se tens permissão.');
        } finally {
            setIsCarregandoAluno(false);
        }
    }

    function fecharModalAluno() {
        setIsAlunoInfoModalAberto(false);
        setAlunoDetalhes(null);
    }

    
    async function handleEliminarSessao() {
        if (!sessaoSelecionada) return;
        
        for (const aluno of sessaoSelecionada.alunos) {
            await adminService.removerAluno(aluno.idAluno, sessaoSelecionada.idCoaching);
        }
        fecharModal();
        fetchAgendamentos();
    }


    return (
        <div className="pagina-ver-agendamentos" style={{ padding: '32px' }}>
            <h1>Os meus agendamentos</h1>

            <TableComponent
                config={{
                    columns: [
                        { key: "data", value: "Data", type: TableColumnTypesEnum.Default },
                        { key: "horario", value: "Horário", type: TableColumnTypesEnum.Default },
                        { key: "modalidade", value: "Modalidade", type: TableColumnTypesEnum.Default },
                        { key: "estado", value: "Estado", type: TableColumnTypesEnum.Default },
                    ],
                    filters: [],
                    searchSettings: {
                        placeholder: "Procurar por palavra-chave",
                        label: "Pesquisa",
                        value: ""
                    },
                    actions: [
                        {
                            icon: "fa-solid fa-eye",
                            tooltip: "Ver Detalhes",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => abrirModal(row)
                        }
                    ]
                }}
                // Passar a variável de estado que guarda os dados
                data={Array.isArray(agendamentos) ? agendamentos : []}
            />

            {/* 1º MODAL: DETALHES DA SESSÃO E GESTÃO DE ALUNOS */}
            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes do Agendamento</h2>
                            <button className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Corpo do Modal da Sessão */}
                        <div className="detalhes-grid" style={{ marginBottom: '24px' }}>
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{sessaoSelecionada.data} | {sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        {sessaoSelecionada.alunos && (
                            <>
                                <h3>Alunos Inscritos ({sessaoSelecionada.alunos.length})</h3>
                                <div className="lista-alunos-modal" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '8px' }}>
                                    {sessaoSelecionada.alunos.map((aluno: any, index: number) => (
                                        <div key={aluno.idAluno || index} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <i className="fa-solid fa-user" style={{ marginRight: '12px', color: '#007bff' }}></i>
                                                <span style={{ fontWeight: '500' }}>{aluno.nome}</span>
                                            </div>

                                            {/* O Botão para abrir o segundo modal */}
                                            <button
                                                onClick={() => abrirModalAluno(aluno)}
                                                disabled={isCarregandoAluno}
                                                style={{
                                                    background: 'none', border: '1px solid #007bff', color: '#007bff',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '6px 12px', borderRadius: '6px', fontSize: '14px'
                                                }}
                                            >
                                                <i className="fa-solid fa-info-circle"></i> {isCarregandoAluno ? 'A carregar...' : 'Ver Info'}
                                            </button>

                                        </div>
                                    ))}
                                    {sessaoSelecionada.alunos.length === 0 && (
                                        <p style={{ padding: '12px', color: '#777', margin: 0 }}>Sem alunos inscritos.</p>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="modal-acoes" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button className="btn-anularSessao" onClick={handleEliminarSessao}>Anular sessão</button>
                            <button className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ========================================================
                2º MODAL: INFORMAÇÃO DO ALUNO (COM Z-INDEX MÁXIMO FORÇADO)
                ======================================================== */}
            {isAlunoInfoModalAberto && alunoDetalhes && (
                <div 
                    className="modal-overlay" 
                    // O z-index 99999 garante que ele fica sempre à frente de qualquer outra coisa no ecrã!
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <div className="modal-conteudo" style={{ maxWidth: '520px', backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '100%', position: 'relative', zIndex: 100000, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        
                        <div className="modal-cabecalho" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                            <h2 style={{ margin: 0 }}>Informação do Aluno</h2>
                            <button 
                                className="btn-fechar-icon" 
                                onClick={fecharModalAluno}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#555' }}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="detalhes-grid" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Nome</span><strong>{alunoDetalhes.nome}</strong></div>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Data de Nascimento</span><strong>{alunoDetalhes.dataNascimento || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>NIF</span><strong>{alunoDetalhes.nif}</strong></div>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Email</span><strong>{alunoDetalhes.email || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Contacto</span><strong>{alunoDetalhes.contacto || 'N/A'}</strong></div>
                            <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Menor de idade</span><strong>{alunoDetalhes.menorIdade ? 'Sim' : 'Não'}</strong></div>
                        </div>

                        {alunoDetalhes.encarregado && (
                            <>
                                <h3 style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Encarregado de Educação</h3>
                                <div className="detalhes-grid" style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Nome</span><strong>{alunoDetalhes.encarregado.nome || 'Sem encarregado'}</strong></div>
                                    <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Email</span><strong>{alunoDetalhes.encarregado.email || 'N/A'}</strong></div>
                                    <div className="detalhe-item"><span style={{ display: 'block', fontSize: '12px', color: '#777' }}>Contacto</span><strong>{alunoDetalhes.encarregado.contacto || 'N/A'}</strong></div>
                                </div>
                            </>
                        )}

                        <div className="modal-acoes" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn-fechar" 
                                onClick={fecharModalAluno}
                                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#f8f9fa', cursor: 'pointer' }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}