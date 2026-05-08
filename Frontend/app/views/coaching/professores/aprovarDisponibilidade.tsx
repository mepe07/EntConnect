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
import { horariosService } from '~/services/horarios.service';


import { showToast } from '~/components/toast/toast';
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


export interface Estudio {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
}

interface ExcecaoAulaFixa {
    Data_Cancelada: string;
}

interface AulaFixa {
    ID_AulaFixa: number;
    Dia_Semana: number;
    Hora_Inicio: string;
    Duracao: number;
    ID_Estudio: number;
    Ativa: boolean;
    Dias_Semana?: {
        Nome_Dia: string;
    };
    Excecao_Aula_Fixa?: ExcecaoAulaFixa[];
}

const DIAS_SEMANA_PT: Record<number, string[]> = {
    0: ['domingo'],
    1: ['segunda', 'segunda-feira'],
    2: ['terca', 'terca-feira', 'terça', 'terça-feira'],
    3: ['quarta', 'quarta-feira'],
    4: ['quinta', 'quinta-feira'],
    5: ['sexta', 'sexta-feira'],
    6: ['sabado', 'sábado'],
};

function normalizarTexto(valor: string) {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function parseDataDisponibilidade(data: string) {
    const [dia, mes, ano] = data.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
}

function dataLocalIso(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function dataIsoDeValor(valor: string) {
    const isoMatch = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor.slice(0, 10);

    return dataLocalIso(data);
}

function minutosDeHora(valor: string) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
        return data.getHours() * 60 + data.getMinutes();
    }

    const match = valor.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;

    return Number(match[1]) * 60 + Number(match[2]);
}

function intervalosSobrepostos(inicioA: number, fimA: number, inicioB: number, fimB: number) {
    return inicioA < fimB && inicioB < fimA;
}

function aulaFixaAconteceNoDia(aula: AulaFixa, dataDisponibilidade: Date) {
    const nomeDia = aula.Dias_Semana?.Nome_Dia;

    if (nomeDia) {
        const nomeNormalizado = normalizarTexto(nomeDia);
        return DIAS_SEMANA_PT[dataDisponibilidade.getDay()].some(dia => nomeNormalizado.includes(normalizarTexto(dia)));
    }

    const diaSemanaPt = dataDisponibilidade.getDay() === 0 ? 7 : dataDisponibilidade.getDay();
    return aula.Dia_Semana === diaSemanaPt;
}

function aulaFixaTemExcecaoNestaData(aula: AulaFixa, dataDisponibilidade: Date) {
    const dataIso = dataLocalIso(dataDisponibilidade);

    return aula.Excecao_Aula_Fixa?.some(excecao => dataIsoDeValor(excecao.Data_Cancelada) === dataIso) ?? false;
}

function calcularEstudiosLivres(disponibilidade: Disponibilidade | null, estudios: Estudio[], aulasFixas: AulaFixa[]) {
    if (!disponibilidade) return estudios;

    const dataDisponibilidade = parseDataDisponibilidade(disponibilidade.data);
    const [horaInicioStr, horaFimStr] = disponibilidade.horario.split(' - ');
    const inicioDisponibilidade = minutosDeHora(horaInicioStr);
    const fimDisponibilidade = minutosDeHora(horaFimStr);

    const estudiosOcupados = new Set(
        aulasFixas
            .filter(aula => aula.Ativa !== false)
            .filter(aula => aulaFixaAconteceNoDia(aula, dataDisponibilidade))
            .filter(aula => !aulaFixaTemExcecaoNestaData(aula, dataDisponibilidade))
            .filter(aula => {
                const inicioAula = minutosDeHora(aula.Hora_Inicio);
                return intervalosSobrepostos(
                    inicioDisponibilidade,
                    fimDisponibilidade,
                    inicioAula,
                    inicioAula + aula.Duracao
                );
            })
            .map(aula => aula.ID_Estudio)
    );

    return estudios.filter(estudio => !estudiosOcupados.has(estudio.ID_Sala));
}


export default function ApproveAvailability() {
    const userInfo = authService.getUserInfo() as User;
    const isCoordenador = userInfo?.role?.toLowerCase().includes('coord');

    const disponibilidadesService = new DisponibilidadesService();
    const salasService = new SalasService();

    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [listaEstudios, setListaEstudios] = useState<Estudio[]>([]);
    const [aulasFixas, setAulasFixas] = useState<AulaFixa[]>([]);

    const [modalAberto, setModalAberto] = useState<boolean>(false);
    const [linhaSelecionada, setLinhaSelecionada] = useState<any>(null);
    const [estudioSelecionado, setEstudioSelecionado] = useState<string>('');
    const [valorPorAluno, setValorPorAluno] = useState<string>('');


    async function fetchDisponibilidades() {
        try {
            const data = await disponibilidadesService.getAvailability() as Disponibilidade[];


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


    async function fetchEstudios() {
        try {
            const data = await salasService.getSalas();
            const salasDisponiveis = data.filter((sala: Estudio) => sala.Disponivel === true);
            setListaEstudios(salasDisponiveis);
        } catch (error) {
            console.error('Erro ao carregar as salas:', error);
        }
    }

    async function fetchAulasFixas() {
        try {
            const data = await horariosService.getHorarios();
            setAulasFixas(data);
        } catch (error) {
            console.error('Erro ao carregar as aulas fixas:', error);
        }
    }

    useEffect(() => {
        if (isCoordenador) {
            fetchDisponibilidades();
            fetchEstudios();
            fetchAulasFixas();
        }
    }, [isCoordenador]);

    if (!isCoordenador) {
        return (
            <div className="pagina-aprovacoes" style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Acesso Negado 🚫</h1>
            </div>
        );
    }


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


    function abrirModalAprovacao(row: any) {
        setLinhaSelecionada(row);
        setEstudioSelecionado('');
        setValorPorAluno('');
        setModalAberto(true);
    }


    function fecharModal() {
        setModalAberto(false);
        setLinhaSelecionada(null);
    }


    async function confirmarAprovacao() {
        if (!estudioSelecionado || !valorPorAluno) {
            showToast('Por favor, selecione um estúdio e insira o valor por aluno.');
            return;
        }

        await handleAtualizarEstado(linhaSelecionada, 1, Number(estudioSelecionado), Number(valorPorAluno));
        fecharModal();
    }


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
            showToast('Erro ao atualizar a disponibilidade.');
        }
    }

    const professoresUnicos = Array.from(new Set(tableData.map(d => d.nomeProfessor).filter(Boolean)));
    const opcoesProfessor = [
        { value: "", label: "Todos" },
        ...professoresUnicos.map(nome => ({ value: nome, label: nome }))
    ];
    const estudiosLivres = calcularEstudiosLivres(linhaSelecionada, listaEstudios, aulasFixas);

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
                                    {estudiosLivres.map(estudio => (
                                        <option key={estudio.ID_Sala} value={estudio.ID_Sala}>
                                            {estudio.Nome}
                                        </option>
                                    ))}
                                </select>
                                {estudiosLivres.length === 0 && (
                                    <p style={{ margin: '0 0 15px', color: '#dc2626', fontSize: '13px' }}>
                                        Nenhum estÃºdio livre para este dia e horÃ¡rio.
                                    </p>
                                )}
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
                                    disabled={!estudioSelecionado || !valorPorAluno || estudiosLivres.length === 0}
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
