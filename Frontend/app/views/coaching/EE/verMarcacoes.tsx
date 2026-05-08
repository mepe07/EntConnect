import { SelectBoxComponent } from '~/components/selectbox/selectbox.component';
import './verMarcacoes.scss';
import { useEffect, useState } from 'react';
import { authService } from '~/services/auth.service';
import { EEService } from '~/services/EE.service';
import type { User } from '~/models/interfaces/user.interface';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';


import { showToast } from '~/components/toast/toast';
export default function VerMarcacoes() {


    const userInfo = authService.getUserInfo() as User;
    console.log('Informações do utilizador:', userInfo);
    if (userInfo.role !== 'Enc_Educacao') {
        return null;
    }

    const eeService = new EEService();


    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroProfessor, setFiltroProfessor] = useState('');
    const [marcacoes, setMarcacoes] = useState<any[]>([]);
    const [isModalAberto, setIsModalAberto] = useState(false);
    const [marcacaoSelecionada, setMarcacaoSelecionada] = useState<any | null>(null);

    async function fetchMarcacoes() {
        try {
            const data = await eeService.getMarcacoesByEE(userInfo.idPessoa || 0);
            setMarcacoes(data);
        }
        catch (error) {
            console.error('Erro ao buscar disponibilidades:', error);
        }
    }

    useEffect(() => {
        fetchMarcacoes();
    }, []);


    const tableData = marcacoes.map((marcacao) => {

        const inicio = new Date(marcacao.Coaching?.Inicio_Coaching);
        const fim = new Date(inicio.getTime() + (marcacao.Coaching?.Duracao || 0) * 60000);

        const formatHora = (data: Date) => data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        const dataInscricao = marcacao.Data_Inscricao ? new Date(marcacao.Data_Inscricao) : null;

        return {
            idCoaching: marcacao.ID_Coaching,
            idAluno: marcacao.ID_Aluno,
            nomeAluno: marcacao.Aluno?.Nome || 'Desconhecido',
            nomeProfessor: marcacao.Coaching?.Professor?.Pessoa?.Nome || 'Não atribuído',
            modalidade: marcacao.Coaching?.Disponibilidade?.Modalidade || 'N/A',
            data: inicio.toLocaleDateString('pt-PT'),
            horario: `${formatHora(inicio)} - ${formatHora(fim)}`,
            valor: marcacao.ValorEmFalta ? `${marcacao.ValorEmFalta} €` : '0 €',
            nomeSala: marcacao.Coaching?.Sala?.Nome || 'Não definido',
            observacoes: marcacao.Observacoes || 'Nenhuma observação.',
            dataInscricao: dataInscricao
            ? `${dataInscricao.toLocaleDateString('pt-PT')} às ${formatHora(dataInscricao)}`
            : 'Desconhecida'
        };
    });

    const modalidadesUnicas = Array.from(new Set(tableData.map((item) => item.modalidade).filter(Boolean)));
    const professoresUnicos = Array.from(new Set(tableData.map((item) => item.nomeProfessor).filter(Boolean)));

    async function handleRemoverMarcacao(row: any) {
        if (window.confirm(`Tem a certeza que deseja cancelar a inscrição do aluno: ${row.nomeAluno}?`)) {
            try {
                await eeService.removerAlunoCoaching(row.idAluno, row.idCoaching);
                showToast('Inscrição cancelada com sucesso!');
                fetchMarcacoes();
            } catch (error) {
                showToast('Erro ao cancelar inscrição.');
            }
        }
    }

    function handleVerDetalhes(row: any) {
        setMarcacaoSelecionada(row);
        setIsModalAberto(true);
    }

    function fecharModal() {
        setIsModalAberto(false);
        setMarcacaoSelecionada(null);
    }

    return (
        <div className="ver-marcacoes-container">

            <div className="cabecalho">
                <div>
                    <h1>Marcações de Coaching</h1>
                    <p>Consulte as marcações de coaching associadas aos seus educandos.</p>
                </div>
            </div>

            <div className="filtros">
                <div className="filtro-item">
                    <label>Modalidade</label>
                    <SelectBoxComponent
                        id="filtro-modalidade"
                        selectedOption={filtroModalidade}
                        onChange={(e) => setFiltroModalidade(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...modalidadesUnicas.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>

                <div className="filtro-item">
                    <label>Professor</label>
                    <SelectBoxComponent
                        id="filtro-professor"
                        selectedOption={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                        options={[{ value: '', label: 'Todos' }, ...professoresUnicos.map((nome) => ({ value: nome, label: nome }))]}
                    />
                </div>
            </div>

            <TableComponent
                config={{
                    columns: [
                        { key: 'nomeAluno', value: 'Aluno', type: TableColumnTypesEnum.Default },
                        { key: 'nomeProfessor', value: 'Professor', type: TableColumnTypesEnum.Default },
                        { key: 'data', value: 'Data', type: TableColumnTypesEnum.Default },
                        { key: 'horario', value: 'Horário', type: TableColumnTypesEnum.Default },
                        { key: 'modalidade', value: 'Modalidade', type: TableColumnTypesEnum.Default },
                        { key: 'valor', value: 'Valor a pagar', type: TableColumnTypesEnum.Default }
                    ],
                    searchSettings: {
                        placeholder: 'Procurar por palavra-chave...',
                        label: 'Pesquisa',
                        value: ''
                    },
                    actions: [
                        {
                            icon: 'fa-solid fa-eye',
                            tooltip: 'Ver Detalhes',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme, size: SizeEnum.Regular },
                            onClick: (row: any) => handleVerDetalhes(row)
                        },
                        {
                            icon: 'fa-solid fa-trash-can',
                            tooltip: 'Cancelar Inscrição',
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Regular },
                            onClick: (row: any) => handleRemoverMarcacao(row)
                        }
                    ]
                }}
                data={tableData.filter((item) =>
                    (filtroProfessor ? item.nomeProfessor === filtroProfessor : true) &&
                    (filtroModalidade ? item.modalidade === filtroModalidade : true)
                )}
            />

            {isModalAberto && marcacaoSelecionada && (
                <div className="modal-overlay">
                    <div className="modal-conteudo">

                        <div className="modal-cabecalho">
                            <h2>Detalhes da Marcação</h2>


                        </div>

                        <div className="detalhes-grid">
                            <div className="detalhe-item">
                                <span>Aluno</span>
                                <strong>{marcacaoSelecionada.nomeAluno}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Professor</span>
                                <strong>{marcacaoSelecionada.nomeProfessor}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Data</span>
                                <strong>{marcacaoSelecionada.data}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Horário</span>
                                <strong>{marcacaoSelecionada.horario}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Modalidade</span>
                                <strong>{marcacaoSelecionada.modalidade}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Valor a Pagar</span>
                                <strong className="destaque-valor">{marcacaoSelecionada.valor}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Estúdio</span>
                                <strong>{marcacaoSelecionada.nomeSala}</strong>
                            </div>
                            <div className="detalhe-item">
                                <span>Data da Inscrição</span>
                                <strong>{marcacaoSelecionada.dataInscricao}</strong>
                            </div>
                            <div className="detalhe-item" style={{ gridColumn: '1 / -1' }}>
                                <span>Observações</span>
                                <strong>{marcacaoSelecionada.observacoes}</strong>
                            </div>
                        </div>

                        <div className="modal-acoes">
                            <button className="btn-fechar" onClick={fecharModal}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>

    )
}