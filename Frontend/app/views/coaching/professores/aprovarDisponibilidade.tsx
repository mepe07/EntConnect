import './aprovarDisponibilidade.scss';
import { useEffect, useState } from 'react';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import { InfoTypesEnum } from '~/components/models/enums/info-types.enum';
import { DisponibilidadesService } from '../../../services/disponibilidades.service';
import { authService } from '~/services/auth.service';
import type { User } from '../../../models/interfaces/user.interface';
import { SalasService } from '../../../services/salas.service';

/**
 * Representa os dados de uma disponibilidade na tabela.
 */
export interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    alteradoPor: string;
    estado: string;
    maxAlunos: number;
}

/**
 * Representa um estúdio ou sala disponível para atribuição.
 */
export interface Estudio {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
}

/**
 * Componente principal para gestão e aprovação de disponibilidades de professores.
 * Exclusivo para utilizadores com a permissão de Coordenação.
 */
export default function ApproveAvailability() {
    const userInfo = authService.getUserInfo() as User;
    const isCoordenador = userInfo?.role?.toLowerCase().includes('coord');

    const disponibilidadesService = new DisponibilidadesService();
    const salasService = new SalasService();
    
    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [listaEstudios, setListaEstudios] = useState<Estudio[]>([]);

    const [modalAberto, setModalAberto] = useState<boolean>(false);
    const [linhaSelecionada, setLinhaSelecionada] = useState<any>(null);
    const [estudioSelecionado, setEstudioSelecionado] = useState<string>('');
    const [valorPorAluno, setValorPorAluno] = useState<string>('');

    /**
     * Obtém a lista de disponibilidades através do serviço correspondente.
     */
    async function fetchDisponibilidades() {
        try {
            const data = await disponibilidadesService.getAvailability();

            // Ordenar por data (ascendente)
            const dadosOrdenados = data.sort((a, b) => {
                const [diaA, mesA, anoA] = a.data.split('/').map(Number);
                const [diaB, mesB, anoB] = b.data.split('/').map(Number);

                const dateA = new Date(`${anoA}-${mesA}-${diaA}`).getTime();
                const dateB = new Date(`${anoB}-${mesB}-${diaB}`).getTime();

                return dateA - dateB;
            });

            setDisponibilidades(dadosOrdenados);
        } catch (error) {
            console.error('Erro ao carregar disponibilidades:', error);
        }
    }

    /**
     * Obtém a lista de estúdios/salas através do serviço correspondente e mostra apenas as disponíveis.
     */
    async function fetchEstudios() {
        try {
            const data = await salasService.getSalas();
            const salasDisponiveis = data.filter((sala: Estudio) => sala.Disponivel === true);
            setListaEstudios(salasDisponiveis);
        } catch (error) {
            console.error('Erro ao carregar as salas:', error);
        }
    }

    useEffect(() => {
        if (isCoordenador) {
            fetchDisponibilidades();
            fetchEstudios();
        }
    }, [isCoordenador]);

    if (!isCoordenador) {
        return (
            <div className="pagina-aprovacoes" style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Acesso Negado 🚫</h1>
            </div>
        );
    }

    /**
     * Mapeia os dados das disponibilidades para incluir as configurações visuais da tabela.
     */
    const tableData = disponibilidades.map(disp => {
        let infoType = InfoTypesEnum.Info;
        if (disp.estado === 'Aprovado') infoType = InfoTypesEnum.Success;
        if (disp.estado === 'Rejeitado') infoType = InfoTypesEnum.Error;
        if (disp.estado === 'Pendente') infoType = InfoTypesEnum.Warning;

        return {
            ...disp,
            estadoChip: { value: disp.estado || "Desconhecido", infoType: infoType }
        };
    });

    /**
     * Prepara e abre o modal de aprovação para a linha selecionada.
     * @param row - Os dados da linha selecionada na tabela.
     */
    function abrirModalAprovacao(row: any) {
        setLinhaSelecionada(row);
        setEstudioSelecionado('');
        setValorPorAluno('');
        setModalAberto(true);
    }

    /**
     * Fecha o modal de aprovação e limpa os estados temporários.
     */
    function fecharModal() {
        setModalAberto(false);
        setLinhaSelecionada(null);
    }

    /**
     * Valida as entradas do modal e processa a aprovação da disponibilidade.
     */
    async function confirmarAprovacao() {
        if (!estudioSelecionado || !valorPorAluno) {
            alert('Por favor, selecione um estúdio e insira o valor por aluno.');
            return;
        }

        await handleAtualizarEstado(linhaSelecionada, 1, Number(estudioSelecionado), Number(valorPorAluno));
        fecharModal();
    }

    /**
     * Processa a alteração de estado (Aprovar/Rejeitar) e envia os dados para a API.
     * @param row - Os dados originais da disponibilidade.
     * @param novoEstado - ID do novo estado (ex: 1 para Aprovado, 3 para Rejeitado).
     * @param idEstudio - (Opcional) ID do estúdio atribuído na aprovação.
     * @param valorPorAluno - (Opcional) Valor por aluno definido na aprovação.
     */
    async function handleAtualizarEstado(row: any, novoEstado: number, idEstudio?: number, valorPorAluno?: number) {
        const alteradoPor = userInfo.idUtilizador;         
        
        const [horaInicioStr, horaFimStr] = row.horario.split(' - '); 
        const [dia, mes, ano] = row.data.split('/'); 

        const dataInicio = new Date(`${ano}-${mes}-${dia}T${horaInicioStr}:00`);
        const dataFim = new Date(`${ano}-${mes}-${dia}T${horaFimStr}:00`);
        const duracaoMinutos = (dataFim.getTime() - dataInicio.getTime()) / 60000;
        const horaInicioIso = dataInicio.toISOString(); 

        if (novoEstado === 3) {
            if (!window.confirm('Tem a certeza que deseja rejeitar este horário?')) return;
        }

        try {
            await disponibilidadesService.atualizarEstado(
                row.idDisponibilidade, 
                novoEstado, 
                horaInicioIso, 
                duracaoMinutos,
                alteradoPor,
                idEstudio, 
                valorPorAluno
            );
            
            fetchDisponibilidades(); 
        } catch (error) {
            alert('Erro ao atualizar a disponibilidade.');
        }
    }

    const professoresUnicos = Array.from(new Set(tableData.map(d => d.nomeProfessor).filter(Boolean)));
    const opcoesProfessor = [
        { value: "", label: "Todos" },
        ...professoresUnicos.map(nome => ({ value: nome, label: nome }))
    ];

    return (
        <div className="pagina-aprovacoes">
            <h1>Aprovação de Disponibilidades</h1>

            <TableComponent
                config={{
                    columns: [
                        { key: "nomeProfessor", value: "Professor", type: TableColumnTypesEnum.Default },
                        { key: "data", value: "Data", type: TableColumnTypesEnum.Default },
                        { key: "horario", value: "Horário", type: TableColumnTypesEnum.Default },
                        { key: "modalidade", value: "Modalidade", type: TableColumnTypesEnum.Default },
                        { key: "maxAlunos", value: "Máx. Alunos", type: TableColumnTypesEnum.Default },
                        { key: "alteradoPor", value: "Alterado Por", type: TableColumnTypesEnum.Default },
                        { key: "estadoChip", value: "Estado", type: TableColumnTypesEnum.Chip }
                    ],
                    filters: [
                        {
                            key: "nomeProfessor",
                            label: "Professor",
                            value: "",
                            options: opcoesProfessor
                        },
                        {
                            key: "estadoChip",
                            label: "Estado",
                            value: "Pendente", 
                            options: [
                                { value: "", label: "Todos" },
                                { value: "Pendente", label: "Pendentes" },
                                { value: "Aprovado", label: "Aprovados" },
                                { value: "Rejeitado", label: "Rejeitados" }
                            ]
                        }
                    ],
                    searchSettings: {
                        placeholder: "Procurar por professor ou dia...",
                        label: "Pesquisa",
                        value: ""
                    },
                    actions: [
                        {
                            icon: "fa-solid fa-check",
                            tooltip: "Aprovar Horário",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Gray, size: SizeEnum.Large },
                            show: (row: any) => row.estado === 'Pendente',
                            onClick: (row: any) => abrirModalAprovacao(row)
                        },
                        {
                            icon: "fa-solid fa-xmark",
                            tooltip: "Rejeitar Horário",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Large },
                            show: (row: any) => row.estado !== 'Rejeitado',
                            onClick: (row: any) => handleAtualizarEstado(row, 3)
                        }
                    ]
                }}
                data={tableData}
            />

            {modalAberto && linhaSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Aprovar Horário</h2>
                            <button className="modal-fechar" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="modal-corpo">
                            <div className="session-info">
                                <h3>Detalhes do Pedido</h3>
                                <p><strong>Professor:</strong> {linhaSelecionada.nomeProfessor}</p>
                                <p><strong>Data:</strong> {linhaSelecionada.data} ({linhaSelecionada.horario})</p>
                            </div>

                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label>Atribuir Estúdio</label>
                                <select 
                                    className="select-box"
                                    style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
                                    value={estudioSelecionado}
                                    onChange={(e) => setEstudioSelecionado(e.target.value)}
                                >
                                    <option value="">Selecione um estúdio...</option>
                                    {listaEstudios.map(estudio => (
                                        <option key={estudio.ID_Sala} value={estudio.ID_Sala}>
                                            {estudio.Nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Valor por aluno (€)</label>
                                <input 
                                    type="number"
                                    style={{ width: '100%', padding: '8px' }}
                                    placeholder="Ex: 25.50"
                                    value={valorPorAluno}
                                    onChange={(e) => setValorPorAluno(e.target.value)}
                                />
                            </div>

                            <div className="modal-acoes" style={{ marginTop: '30px' }}>
                                <button className="btn-cancelar" onClick={fecharModal}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-confirmar"
                                    onClick={confirmarAprovacao}
                                    disabled={!estudioSelecionado || !valorPorAluno}
                                >
                                    Confirmar Aprovação
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}