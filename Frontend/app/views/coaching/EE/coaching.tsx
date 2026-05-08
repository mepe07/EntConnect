import { ButtonComponent } from '~/components/button/button.component';
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

import { showToast } from '~/components/toast/toast';
interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    horario: string;
    modalidade: string;
    estado: string;
    valorPorAluno: number;
    maxAlunos: number;
    idProfessor: number;
    idEstudio: number;
    duracao: number;
    idCoordenador: number;
    alunosInscritosIds: number[];
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


    const userInfo = authService.getUserInfo() as User;
    if (userInfo.role !== 'Enc_Educacao') {
        return null;
    }
    console.log(userInfo);

    const disponibilidadesService = new DisponibilidadesService();
    const eeService = new EEService();
    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [disponibilidadeSelecionada, setDisponibilidadeSelecionada] = useState<Disponibilidade | null>(null);
    const [alunoSelecionado, setAlunoSelecionado] = useState<number | null>(null);
    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const tableData = disponibilidades
    .filter((disp) => disp.maxAlunos > 0)
    .map((disp) => ({ ...disp }))
    .sort((a, b) => {


        const [diaA, mesA, anoA] = a.data.split('/');
        const [diaB, mesB, anoB] = b.data.split('/');


        const dataA = new Date(`${anoA}-${mesA}-${diaA}`);
        const dataB = new Date(`${anoB}-${mesB}-${diaB}`);


        if (dataA < dataB) return -1;
        if (dataA > dataB) return 1;


        return a.modalidade.localeCompare(b.modalidade);
    });

    async function fetchDisponibilidades() {
        try {
            const data = await disponibilidadesService.getAvailability();

            const approved = data.filter((disp: Disponibilidade) => disp.estado === 'Aprovado');

            console.log('Disponibilidades aprovadas:', approved);

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
            showToast('Por favor selecione uma sessão e um aluno.');
            return;
        }

        try {


            const [dia, mes, ano] = disponibilidadeSelecionada.data.split('/');
            const [horaInicioStr] = disponibilidadeSelecionada.horario.split(' - ');
            const inicioCoachingFormatado = new Date(`${ano}-${mes}-${dia}T${horaInicioStr}:00`).toISOString();


            const payload = {
                idAluno: alunoSelecionado,
                idEncEducacao: userInfo.idPessoa,
                idProfessor: disponibilidadeSelecionada.idProfessor,
                idEstadoCoaching: 7,
                idSala: disponibilidadeSelecionada.idEstudio,
                valorPorAluno: disponibilidadeSelecionada.valorPorAluno,
                inicio_Coaching: inicioCoachingFormatado,
                duracao: disponibilidadeSelecionada.duracao,
                idCoordenador: disponibilidadeSelecionada.idCoordenador,
                valorEmFalta: disponibilidadeSelecionada.valorPorAluno,
                obs: observacoes
            };


            await eeService.inscreverAlunoCoaching(
                disponibilidadeSelecionada.idDisponibilidade,
                payload
            );

            showToast('Aluno inscrito com sucesso!');
            fecharModal();


            fetchDisponibilidades();

        } catch (error: any) {
            console.error('Erro ao inscrever aluno:', error);
            showToast(error.message || 'Não foi possível inscrever o aluno.');
        }
    }

    function abrirModal(row: Disponibilidade) {
        setDisponibilidadeSelecionada(row);
        setAlunoSelecionado(null);
        setModalAberto(true);
    }

    function fecharModal() {
        setObservacoes('');
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

    const alunosOptions = alunos
        .filter(aluno => {

            if (!disponibilidadeSelecionada) return true;


            return !disponibilidadeSelecionada.alunosInscritosIds.includes(aluno.ID_aluno);
        })
        .map(aluno => ({
            value: aluno.ID_aluno.toString(),
            label: aluno.Nome
        }));

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
                        { key: 'valorPorAluno', value: 'Valor p/ Aluno', type: TableColumnTypesEnum.Default },
                        { key: 'maxAlunos', value: 'Vagas Disp.', type: TableColumnTypesEnum.Default }
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
                            <ButtonComponent className="modal-fechar" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark" />
                            </ButtonComponent>
                        </div>

                        <div className="modal-corpo">
                            <div className="session-info">
                                <h3>Detalhes da sessão</h3>
                                <p><strong>Professor:</strong> {disponibilidadeSelecionada.nomeProfessor}</p>
                                <p><strong>Data:</strong> {disponibilidadeSelecionada.data}</p>
                                <p><strong>Horário:</strong> {disponibilidadeSelecionada.horario}</p>
                                <p><strong>Modalidade:</strong> {disponibilidadeSelecionada.modalidade}</p>
                                <p><strong>Valor a pagar:</strong> {disponibilidadeSelecionada.valorPorAluno.toFixed(2)}€</p>
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

                            <div className="form-group">
                                <label>Observações (Opcional)</label>
                                <textarea
                                    className="input-observacoes"
                                    rows={3}
                                    placeholder="Escreva aqui alguma observação que ache relevante"
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical', color: '#333' }}
                                />
                            </div>

                            <div className="modal-acoes">
                                <ButtonComponent className="btn-cancelar" onClick={fecharModal}>
                                    Cancelar
                                </ButtonComponent>
                                <ButtonComponent
                                    className="btn-confirmar"
                                    onClick={handleInscreverAluno}
                                    disabled={!alunoSelecionado}
                                >
                                    Inscrever
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
