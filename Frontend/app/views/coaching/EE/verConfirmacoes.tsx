import './verMarcacoes.scss';
import { useEffect, useState } from 'react';
import { authService } from '~/services/auth.service';
import { RolesService } from '~/services/roles.service';
import { EEService } from '~/services/EE.service';
import type { User } from '~/models/interfaces/user.interface';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';

import { showToast } from '~/components/toast/toast';
export default function VerConfirmacoesEE() {
    const userInfo = authService.getUserInfo() as User;
    const isEncEducacao = userInfo?.role === 'Enc_Educacao';
    const eeService = new EEService();
    const rolesService = new RolesService();

    const [confirmacoes, setConfirmacoes] = useState<any[]>([]);
    const [idEE, setIdEE] = useState<number | null>(null);
    const [sessaoSelecionada, setSessaoSelecionada] = useState<any | null>(null);
    const [isAguardar, setIsAguardar] = useState(false);

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
                <h1>Acesso Negado 🚫</h1>
                <p>Esta área é apenas para Encarregados de Educação.</p>
            </div>
        );
    }

    function abrirModal(sessao: any) {
        setSessaoSelecionada(sessao);
    }

    function fecharModal() {
        setSessaoSelecionada(null);
    }

    async function handleConfirmacao(sessao: any, idEstadoCoaching: number) {
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

    const tableData = confirmacoes.map((sessao) => ({
        idCoaching: sessao.idCoaching,
        data: sessao.data,
        horario: sessao.horario,
        modalidade: sessao.modalidade,
        estado: sessao.estado,
        professor: sessao.professor,
        alunos: Array.isArray(sessao.alunos) ? sessao.alunos.map((a: any) => a.nome).join(', ') : 'N/A',
    }));

    return (
        <div className="ver-marcacoes-container">
            <div className="cabecalho">
                <div>
                    <h1>Confirmações de Coaching</h1>
                    <p>Confirme se as sessões dos seus educandos foram realizadas ou não.</p>
                </div>
            </div>

            <TableComponent
                config={{
                    columns: [
                        { key: 'data', value: 'Data', type: TableColumnTypesEnum.Default },
                        { key: 'horario', value: 'Horário', type: TableColumnTypesEnum.Default },
                        { key: 'modalidade', value: 'Modalidade', type: TableColumnTypesEnum.Default },
                        { key: 'professor', value: 'Professor', type: TableColumnTypesEnum.Default },
                        { key: 'alunos', value: 'Alunos', type: TableColumnTypesEnum.Default },
                        { key: 'estado', value: 'Estado', type: TableColumnTypesEnum.Default },
                    ],
                    filters: [],
                    searchSettings: {
                        placeholder: 'Procurar por palavra-chave...',
                        label: 'Pesquisa',
                        value: ''
                    },
                    actions: [
                        {
                            icon: 'fa-solid fa-eye',
                            tooltip: 'Ver detalhes da sessão',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => abrirModal(row),
                        },
                        {
                            icon: 'fa-solid fa-check',
                            tooltip: 'Confirmar que a sessão foi realizada',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => handleConfirmacao(row, 13),
                        },
                        {
                            icon: 'fa-solid fa-xmark',
                            tooltip: 'Indicar que a sessão não aconteceu',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Regular },
                            onClick: (row: any) => handleConfirmacao(row, 14),
                        },
                    ]
                }}
                data={tableData}
            />

            {sessaoSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Detalhes da Sessão</h2>
                            <button className="btn-fechar-icon" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item"><span>Data</span><strong>{sessaoSelecionada.data}</strong></div>
                            <div className="detalhe-item"><span>Horário</span><strong>{sessaoSelecionada.horario}</strong></div>
                            <div className="detalhe-item"><span>Modalidade</span><strong>{sessaoSelecionada.modalidade}</strong></div>
                            <div className="detalhe-item"><span>Professor</span><strong>{sessaoSelecionada.professor}</strong></div>
                            <div className="detalhe-item" style={{ gridColumn: '1 / -1' }}><span>Alunos</span><strong>{sessaoSelecionada.alunos}</strong></div>
                            <div className="detalhe-item"><span>Estado</span><strong>{sessaoSelecionada.estado}</strong></div>
                        </div>

                        <div className="modal-acoes">
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
