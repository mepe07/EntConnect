import './coaching.scss';
import { useEffect, useState } from 'react';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import { InfoTypesEnum } from '~/components/models/enums/info-types.enum';
import { authService } from '~/services/auth.service';
import type { User } from '../../../models/interfaces/user.interface';
import { DisponibilidadesService } from '../../../services/disponibilidades.service';
import { InputComponent } from '~/components/input/input.component';
import { SelectBoxComponent } from '~/components/selectbox/selectbox.component';
import { EEService } from '~/services/EE.service';

interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    valorPorAluno: number;
    maxAlunos: number;
}

interface Aluno {
    ID_aluno: number;
    Nome: string;
    Data_Nascimento: string;
    NIF: string;
    Mail?: string;
    Contato?: string;
    Menor_Idade: boolean;
}

export default function CoachingEE() {

    // Validar o role do utilizador 
    const userInfo = authService.getUserInfo() as User;
    if (userInfo.role !== 'Enc_Educacao') {
        return null;
    }

    const disponibilidadesService = new DisponibilidadesService();
    const eeService = new EEService();
    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [disponibilidadeSelecionada, setDisponibilidadeSelecionada] = useState<Disponibilidade | null>(null);
    const [alunoSelecionado, setAlunoSelecionado] = useState<number | null>(null);
    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState('');

    const tableData = disponibilidades.map((disp) => {
        let infoType = InfoTypesEnum.Info;
        if (disp.estado === 'Aprovado') infoType = InfoTypesEnum.Success;
        if (disp.estado === 'Rejeitado') infoType = InfoTypesEnum.Error;
        if (disp.estado === 'Pendente') infoType = InfoTypesEnum.Warning;

        return {
            ...disp,
            estadoChip: { value: disp.estado || 'Desconhecido', infoType }
        };
    });

    async function fetchDisponibilidades() {
        try {
            const data = await disponibilidadesService.getAvailability();

            const approved = data.filter((disp: Disponibilidade) => disp.estado === 'Aprovado');
            
            setDisponibilidades(approved);
        } catch (error) {
            console.error('Erro ao buscar disponibilidades:', error);
        }
    }

    async function fetchAlunos() {
            const userInfo = authService.getUserInfo() as User;
            const idEE = userInfo.idPessoa;
            const data = await eeService.getAlunosByEE(idEE);
            setAlunos(data);
    }

    async function handleInscreverAluno() {
        if (!disponibilidadeSelecionada || !alunoSelecionado) {
            alert('Por favor selecione uma sessão e um aluno.');
            return;
        }


        try {
            const response = await fetch(
                `http://localhost:3000/coaching/${disponibilidadeSelecionada.idDisponibilidade}/inscrever-aluno`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idAluno: alunoSelecionado })
                }
            );

            console.log('Resposta da inscrição:', response);

            if (!response.ok) {
                throw new Error('Falha na inscrição');
            }

            alert('Aluno inscrito com sucesso!');
            fecharModal();
        } catch (error) {
            console.error('Erro ao inscrever aluno:', error);
            alert('Não foi possível inscrever o aluno.');
        }
    }

    function abrirModal(row: Disponibilidade) {
        setDisponibilidadeSelecionada(row);
        setAlunoSelecionado(null);
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setDisponibilidadeSelecionada(null);
        setAlunoSelecionado(null);
    }

    useEffect(() => {
        fetchDisponibilidades();
        fetchAlunos();
    }, []);

    const professoresUnicos = Array.from(new Set(tableData.map((item) => item.nomeProfessor).filter(Boolean)));
    const modalidadesUnicas = Array.from(new Set(tableData.map((item) => item.modalidade).filter(Boolean)));

    const alunosOptions = alunos.map((aluno) => ({ value: aluno.ID_aluno.toString(), label: aluno.Nome }));

    return (
        <div className="pagina-coaching-ee">
            <div className="cabecalho">
                <div>
                    <h1>Oferta de Coaching</h1>
                    <p>Consulte as sessões de coaching disponíveis e inscreva os seus educandos.</p>
                </div>
            </div>

            <div className="filtros">
                <div className="filtro-item">
                    <label>Professor</label>
                    <SelectBoxComponent
                        id="filtro-professor"
                        selectedOption={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...professoresUnicos.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>

                <div className="filtro-item">
                    <label>Modalidade</label>
                    <SelectBoxComponent
                        id="filtro-modalidade"
                        selectedOption={filtroModalidade}
                        onChange={(e) => setFiltroModalidade(e.target.value)}
                        options={[{ value: '', label: 'Todas' }, ...modalidadesUnicas.map((modalidade) => ({ value: modalidade, label: modalidade }))]}
                    />
                </div>
            </div>

            <TableComponent
                config={{
                    columns: [
                        { key: 'nomeProfessor', value: 'Professor', type: TableColumnTypesEnum.Default },
                        { key: 'data', value: 'Data', type: TableColumnTypesEnum.Default },
                        { key: 'horario', value: 'Horário', type: TableColumnTypesEnum.Default },
                        { key: 'modalidade', value: 'Modalidade', type: TableColumnTypesEnum.Default },
                        { key: 'valorPorAluno', value: 'Valor por Aluno', type: TableColumnTypesEnum.Default },
                        { key: 'maxAlunos', value: 'Máximo de Alunos', type: TableColumnTypesEnum.Default }
                    ],
                    searchSettings: {
                        placeholder: 'Procurar por professor ou modalidade...',
                        label: 'Pesquisa',
                        value: ''
                    },
                    actions: [
                        {
                            icon: 'fa-solid fa-user-plus',
                            tooltip: 'Adicionar Aluno',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => abrirModal(row)
                        }
                    ]
                }}
                data={tableData.filter((item) =>
                    (filtroProfessor ? item.nomeProfessor === filtroProfessor : true) &&
                    (filtroModalidade ? item.modalidade === filtroModalidade : true)
                )}
            />

            {modalAberto && disponibilidadeSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">
                        <div className="modal-cabecalho">
                            <h2>Adicionar aluno à sessão</h2>
                            <button className="modal-fechar" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="modal-corpo">
                            <div className="session-info">
                                <h3>Detalhes da sessão</h3>
                                <p><strong>Professor:</strong> {disponibilidadeSelecionada.nomeProfessor}</p>
                                <p><strong>Data:</strong> {disponibilidadeSelecionada.data}</p>
                                <p><strong>Horário:</strong> {disponibilidadeSelecionada.horario}</p>
                                <p><strong>Modalidade:</strong> {disponibilidadeSelecionada.modalidade}</p>
                            </div>

                            <div className="form-group">
                                <label>Aluno</label>
                                <SelectBoxComponent
                                    id="aluno-select"
                                    selectedOption={alunoSelecionado?.toString() || ''}
                                    onChange={(e) => setAlunoSelecionado(e.target.value ? Number(e.target.value) : null)}
                                    options={[{ value: '', label: 'Selecione um aluno' }, ...alunosOptions]}
                                />
                            </div>

                            <div className="modal-acoes">
                                <button className="btn-cancelar" onClick={fecharModal}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-confirmar"
                                    onClick={handleInscreverAluno}
                                    disabled={!alunoSelecionado}
                                >
                                    Inscrever
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
