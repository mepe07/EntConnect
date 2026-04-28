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


export default function VerAgendamentos() {
    const userInfo = authService.getUserInfo() as User;
    const isProfessor = userInfo?.role.toLowerCase().includes('professor');
    const agendamentosService = new AgendamentosService();
    const [agendamentos, setAgendamentos] = useState<any[]>([]);
    const rolesService = new RolesService();
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<any | null>(null);

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
        console.log("Dados que vieram da tabela:", sessao);
        setIsModalAberto(true);       // Abre o modal
    }

    function fecharModal() {
        setIsModalAberto(false);      // Fecha o modal
        setSessaoSelecionada(null);   // Limpa os dados
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

            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes do Agendamento</h2>
                            <button className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Corpo do Modal - Podes aceder às propriedades da sessão selecionada */}
                        <div className="detalhes-grid" style={{ marginBottom: '24px' }}>
                            <div className="detalhe-item"><span>Data e Horário</span><strong>{sessaoSelecionada.data} | {sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        {/* Se tiveres a lista de alunos a vir da API, podes mostrá-la aqui */}
                        {sessaoSelecionada.alunos && (
                            <>
                                <h3>Alunos Inscritos ({sessaoSelecionada.alunos.length})</h3>
                                <ul style={{ paddingLeft: '20px', marginBottom: '24px' }}>
                                    {sessaoSelecionada.alunos.map((aluno: any) => (
                                        <li key={aluno.idAluno}>{aluno.nome}</li>
                                    ))}
                                </ul>
                            </>
                        )}

                        <div className="modal-acoes" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}




        </div>
    );
}