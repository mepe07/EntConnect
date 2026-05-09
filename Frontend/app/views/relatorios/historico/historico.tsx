import { showToast } from '~/components/toast/toast';

import './historico.scss';
import { useState, useMemo, useEffect } from 'react';
import { TableComponent } from '../../../components/table/table.component';
import { TableColumnTypesEnum } from '../../../components/table/models/enums/table-column-types.enum';
import { ButtonComponent } from '../../../components/button/button.component';
import { InputComponent } from '../../../components/input/input.component';
import { faturacaoService } from "../../../services/faturacao.service";
import type { LinhaHistoricoCoaching } from '../../../models/interfaces/historico.interface'

export function HistoricoCoaching() {


    const [filtro, setFiltro] = useState({ dataInicio: '', dataFim: '' });
    const [aulas, setAulas] = useState<LinhaHistoricoCoaching[]>([]);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
    const [aCarregar, setACarregar] = useState(false);

    const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
    const [pesquisaAluno, setPesquisaAluno] = useState('');


    useEffect(() => {
        if (alunoSelecionado) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [alunoSelecionado]);


    const handlePesquisa = async () => {
        if (!filtro.dataInicio || !filtro.dataFim) return showToast('Por favor, selecione ambas as datas.');

        setACarregar(true);
        try {

            const dados = await faturacaoService.getHistorico(filtro.dataInicio, filtro.dataFim);
            setAulas(dados);
            setPesquisaRealizada(true);
            setAlunoSelecionado(null);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            showToast('Ocorreu um erro. O servidor pode estar em baixo.');
        } finally {
            setACarregar(false);
        }
    };


    const resumoAlunos = useMemo(() => {
        const resumo: Record<string, any> = {};

        aulas.forEach(aula => {
            if (!resumo[aula.nomeAluno]) {
                resumo[aula.nomeAluno] = {
                    nome: aula.nomeAluno,
                    totalAulas: 0
                };
            }
            resumo[aula.nomeAluno].totalAulas++;
        });


        return Object.values(resumo).sort((a, b) => b.totalAulas - a.totalAulas);
    }, [aulas]);


    const alunosFiltrados = resumoAlunos.filter(a =>
        a.nome.toLowerCase().includes(pesquisaAluno.toLowerCase())
    );

    const alunoFocado = resumoAlunos.find(a => a.nome === alunoSelecionado);


    const tableData = aulas
        .filter(aula => aula.nomeAluno === alunoSelecionado)
        .map(aula => {
            const dataObj = new Date(aula.dataAula);


            const apenasData = dataObj.toLocaleDateString('pt-PT');

            const apenasHora = dataObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });


            let corChip = 'default';
            if (aula.estadoAula === 'Realizada') corChip = 'success';
            if (aula.estadoAula === 'Agendada') corChip = 'warning';
            if (aula.estadoAula === 'Cancelada' || aula.estadoAula === 'Faltou') corChip = 'error';

            return {
                ...aula,
                dataFormatada: apenasData,
                horaFormatada: apenasHora,
                estadoTabela: {
                    value: aula.estadoAula,
                    infoType: corChip
                }
            };
        });


    return (
        <div className="pagina-historico">
            <h1>Histórico de Coaching</h1>

            <div className="filtros-iniciais">
                <div className="grupo-data">
                    <label>Data Início</label>
                    <input type="date" value={filtro.dataInicio} onChange={e => setFiltro({ ...filtro, dataInicio: e.target.value })} />
                </div>
                <div className="grupo-data">
                    <label>Data Final</label>
                    <input type="date" value={filtro.dataFim} onChange={e => setFiltro({ ...filtro, dataFim: e.target.value })} />
                </div>
                <ButtonComponent
                    label={aCarregar ? "A carregar..." : "Pesquisar"}
                    disabled={aCarregar}
                    onClick={handlePesquisa}
                    icon="fa-solid fa-magnifying-glass"
                />
            </div>

            {pesquisaRealizada && (
                <div className="layout-master-detail">

                    <div className="painel-esquerdo">
                        <h3><i className="fa-solid fa-user-graduate"></i> Diário de Turma</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <InputComponent
                                id="pesquisa-aluno"
                                placeholder="🔍 Procurar aluno..."
                                value={pesquisaAluno}
                                onChange={(e) => setPesquisaAluno(e.target.value)}
                            />
                        </div>

                        <div className="lista-cards">
                            {alunosFiltrados.map(a => (
                                <div key={a.nome} className={`card-resumo ${alunoSelecionado === a.nome ? 'ativo' : ''}`} onClick={() => setAlunoSelecionado(a.nome)}>
                                    <div className="foto-container">
                                        <div className="foto-fallback">{a.nome[0]}</div>
                                    </div>
                                    <div className="info-prof">
                                        <h4>{a.nome}</h4>
                                        <div className="stats-resumo">{a.totalAulas} aulas neste período</div>
                                    </div>
                                </div>
                            ))}
                            {alunosFiltrados.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>Nenhum aluno encontrado.</p>
                            )}
                        </div>
                    </div>


                    <div className="painel-direito">
                        {alunoSelecionado ? (
                            <div className="detalhe-conteudo">
                                <div className="cabecalho-detalhe">
                                    <div className="info-selecionada">
                                        <div className="foto-grande foto-fallback" style={{ fontSize: '2rem' }}>{alunoSelecionado[0]}</div>
                                        <h2>{alunoSelecionado}</h2>
                                    </div>
                                    <div className="kpis">
                                        <div className="kpi-box"><span className="label">Total Aulas</span><span className="valor">{alunoFocado?.totalAulas}</span></div>
                                    </div>
                                </div>
                                <TableComponent
                                    config={{
                                        columns: [
                                            { key: 'dataFormatada', value: 'Data' },
                                            { key: 'horaFormatada', value: 'Hora' },
                                            { key: 'nomeProfessor', value: 'Professor' },
                                            { key: 'nomeSala', value: 'Estúdio' },
                                            { key: 'estadoTabela', value: 'Estado', type: TableColumnTypesEnum.Chip }
                                        ]
                                    }}
                                    data={tableData}
                                />
                            </div>
                        ) : (
                            <div className="empty-state">
                                <h3>Selecione um aluno para ver o histórico</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}