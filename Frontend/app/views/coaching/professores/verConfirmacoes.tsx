import './verAgendamentos.scss';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { TableComponent } from '~/components/table/table.component';
import type { User } from '~/models/interfaces/user.interface';
import { authService } from '~/services/auth.service';
import { AgendamentosService } from '~/services/agendamentos.service';
import { useEffect, useState } from 'react';
import { RolesService } from '~/services/roles.service';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';

export default function VerConfirmacoes() {
    const userInfo = authService.getUserInfo() as User;
    const isProfessor = userInfo?.role?.toLowerCase().includes('professor');
    const agendamentosService = new AgendamentosService();
    const rolesService = new RolesService();
    const [confirmacoes, setConfirmacoes] = useState<any[]>([]);
    const [idProfessor, setIdProfessor] = useState<number | null>(null);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<any | null>(null);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [isAguardar, setIsAguardar] = useState(false);

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
            <div className="pagina-agendamentos" style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Acesso Negado 🚫</h1>
                <p>Esta área é apenas para professores.</p>
            </div>
        );
    }

    function abrirModal(sessao: any) {
        setSessaoSelecionada(sessao);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setSessaoSelecionada(null);
    }

    async function handleConfirmacao(sessao: any, idEstadoCoaching: number) {
        if (!idProfessor) return;

        const mensagem = idEstadoCoaching === 13
            ? 'Confirmar que a sessão foi realizada?'
            : 'Marcar esta sessão como não realizada?';

        if (!window.confirm(mensagem)) {
            return;
        }

        setIsAguardar(true);
        try {
            await agendamentosService.confirmarSessao(idProfessor, sessao.idCoaching, idEstadoCoaching);
            alert('Estado atualizado com sucesso.');
            fetchConfirmacoes();
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar o estado da sessão.');
        } finally {
            setIsAguardar(false);
        }
    }

    return (
        <div className="pagina-ver-agendamentos" style={{ padding: '32px' }}>
            <h1>Confirmações de Coaching</h1>
            <p>Estas são as sessões já passadas que ainda precisam de confirmação.</p>

            <TableComponent
                config={{
                    columns: [
                        { key: 'data', value: 'Data', type: TableColumnTypesEnum.Default },
                        { key: 'horario', value: 'Horário', type: TableColumnTypesEnum.Default },
                        { key: 'modalidade', value: 'Modalidade', type: TableColumnTypesEnum.Default },
                        { key: 'estado', value: 'Estado', type: TableColumnTypesEnum.Default },
                    ],
                    filters: [],
                    searchSettings: {
                        placeholder: 'Procurar por palavra-chave',
                        label: 'Pesquisa',
                        value: ''
                    },
                    actions: [
                        {
                            label: 'Ver',
                            icon: 'fa-solid fa-eye',
                            tooltip: 'Ver detalhes da sessão',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => abrirModal(row),
                        },
                        {
                            label: 'Realizada',
                            icon: 'fa-solid fa-check',
                            tooltip: 'Confirmar que a sessão foi realizada',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => handleConfirmacao(row, 13),
                        },
                        {
                            label: 'Não aconteceu',
                            icon: 'fa-solid fa-xmark',
                            tooltip: 'Indicar que a sessão não aconteceu',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Regular },
                            onClick: (row: any) => handleConfirmacao(row, 14),
                        },
                    ]
                }}
                data={Array.isArray(confirmacoes) ? confirmacoes : []}
            />

            {isModalAberto && sessaoSelecionada && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <button className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

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
                                        </div>
                                    ))}
                                    {sessaoSelecionada.alunos.length === 0 && (
                                        <p style={{ padding: '12px', color: '#777', margin: 0 }}>Sem alunos inscritos.</p>
                                    )}
                                </div>
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

            {isAguardar && (
                <div style={{ marginTop: '16px', color: '#555' }}>
                    A atualizar a confirmação...
                </div>
            )}
        </div>
    );
}
