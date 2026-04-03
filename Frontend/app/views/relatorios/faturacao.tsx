// Ficheiro: app/views/relatorios/faturacao/faturacao.tsx
import './faturacao.scss';
import { useState, useMemo } from 'react';
import type { LinhaFaturacaoCoaching, FiltroFaturacao } from '~/models/interfaces/faturacao.interface';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonComponent } from '~/components/button/button.component';

import fotoProfessorLocal from '../../assets/media/image.png';

const MOCK_FATURACAO: LinhaFaturacaoCoaching[] = [
    { idCoaching: 1, dataAula: '2026-04-03', nomeProfessor: 'Alexandrino Jasmin', fotoProfessorUrl: fotoProfessorLocal, nomeAluno: 'Miguel Batista', valorTotal: 69.00, estaPago: false, duracaoMinutos: 60, salaNome: 'Sala Mozart 1' },
    { idCoaching: 2, dataAula: '2026-04-04', nomeProfessor: 'Ana Oliveira', fotoProfessorUrl: 'data:image/webp;base64,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', nomeAluno: 'Sofia Ribeiro', valorTotal: 75.50, estaPago: false, duracaoMinutos: 90, salaNome: 'Sala Beethoven' },
    { idCoaching: 3, dataAula: '2026-04-05', nomeProfessor: 'João Silva', fotoProfessorUrl: 'https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTG4rgJ8NsHPQDhaUWKQUo6IuD8H-4qkU0jicx42UU3hGkTBcbC75KPfwAzInAWRSjkJcbFmIRjylXHNTayf-lQbgMj43UdIT4CtquKYfL3A7gEgmkdLh8CUpX2NNRelqKUGQMqwPSlOeM&s=19', nomeAluno: 'Carlos Costa', valorTotal: 50.00, estaPago: true, duracaoMinutos: 60, salaNome: 'Sala Mozart 2' },
    { idCoaching: 4, dataAula: '2026-04-06', nomeProfessor: 'Diana Rodrigues', fotoProfessorUrl: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQhvJb1Sf2zVHZYzZ5KeZM38aRiv9U42bd4XFcJh-wB6a7VXrQW67IfGFQneBcfuVYZwaMViwzdET-ZEoYZSJnvVlwrQa-t', nomeAluno: 'Rui Pedro', valorTotal: 120.00, estaPago: true, duracaoMinutos: 120, salaNome: 'Estúdio Principal' },
];

export function Faturacao() {
    const [filtro, setFiltro] = useState<FiltroFaturacao>({ dataInicio: '', dataFim: '' });
    const [faturas, setFaturas] = useState<LinhaFaturacaoCoaching[]>([]);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
    const [professorSelecionado, setProfessorSelecionado] = useState<string | null>(null);

    const handlePesquisa = () => {
        if (!filtro.dataInicio || !filtro.dataFim) return alert("Selecione as datas!");
        setFaturas(MOCK_FATURACAO);
        setPesquisaRealizada(true);
        setProfessorSelecionado(null);
    };

    // Agrupamento para os Cards da esquerda
    const resumoProfessores = useMemo(() => {
        const resumo: Record<string, any> = {};
        faturas.forEach(f => {
            if (!resumo[f.nomeProfessor]) {
                resumo[f.nomeProfessor] = { nome: f.nomeProfessor, foto: f.fotoProfessorUrl, totalAulas: 0, totalDinheiro: 0 };
            }
            resumo[f.nomeProfessor].totalAulas++;
            resumo[f.nomeProfessor].totalDinheiro += f.valorTotal;
        });
        return Object.values(resumo).sort((a, b) => b.totalDinheiro - a.totalDinheiro);
    }, [faturas]);

    const profFocado = resumoProfessores.find(p => p.nome === professorSelecionado);
    
    // Dados filtrados para a tabela da direita
    const tableData = faturas
        .filter(f => f.nomeProfessor === professorSelecionado)
        .map(f => ({
            ...f,
            estadoTabela: {
                value: f.estaPago ? 'Pago' : 'Pendente',
                infoType: f.estaPago ? '' : 'error'
            }
        }));

    return (
        <div className="pagina-faturacao">
            <h1>Report de Faturação</h1>

            <div className="filtros-iniciais">
                <div className="grupo-data">
                    <label>Data Início</label>
                    <input type="date" value={filtro.dataInicio} onChange={e => setFiltro({ ...filtro, dataInicio: e.target.value })} />
                </div>
                <div className="grupo-data">
                    <label>Data Final</label>
                    <input type="date" value={filtro.dataFim} onChange={e => setFiltro({ ...filtro, dataFim: e.target.value })} />
                </div>
                <ButtonComponent label="Pesquisar" icon="fa-solid fa-magnifying-glass" onClick={handlePesquisa} />
            </div>

            {pesquisaRealizada && (
                <div className="layout-master-detail">
                    <div className="painel-esquerdo">
                        <h3><i className="fa-solid fa-users"></i> Resumo por Professor</h3>
                        <div className="lista-cards">
                            {resumoProfessores.map(p => (
                                <div key={p.nome} className={`card-resumo ${professorSelecionado === p.nome ? 'ativo' : ''}`} onClick={() => setProfessorSelecionado(p.nome)}>
                                    <div className="foto-container">
                                        {p.foto ? <img src={p.foto} alt={p.nome} /> : <div className="foto-fallback">{p.nome[0]}</div>}
                                    </div>
                                    <div className="info-prof">
                                        <h4>{p.nome}</h4>
                                        <div className="stats-resumo">{p.totalAulas} aulas • {p.totalDinheiro.toFixed(2)}€</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="painel-direito">
                        {professorSelecionado ? (
                            <div className="detalhe-conteudo">
                                <div className="cabecalho-detalhe">
                                    <div className="info-selecionada">
                                        {profFocado?.foto && <img src={profFocado.foto} className="foto-grande" alt="" />}
                                        <h2>{professorSelecionado}</h2>
                                    </div>
                                    <div className="kpis">
                                        <div className="kpi-box"><span className="label">Aulas</span><span className="valor">{profFocado?.totalAulas}</span></div>
                                        <div className="kpi-box"><span className="label">Total</span><span className="valor">{profFocado?.totalDinheiro.toFixed(2)}€</span></div>
                                    </div>
                                </div>
                                <TableComponent 
                                    config={{
                                        columns: [
                                            { key: 'dataAula', value: 'Data' },
                                            { key: 'nomeAluno', value: 'Aluno' },
                                            { key: 'valorTotal', value: 'Montante', type: TableColumnTypesEnum.ChipMoney },
                                            { key: 'estadoTabela', value: 'Estado', type: TableColumnTypesEnum.Chip }
                                        ],
                                        filters: [
                                            { key: 'estadoTabela', label: 'Filtrar Pagamento', value: '', options: [{ value: '', label: 'Todos' }, { value: 'Pago', label: 'Pago' }, { value: 'Pendente', label: 'Pendente' }] }
                                        ]
                                    }}
                                    data={tableData}
                                />
                            </div>
                        ) : (
                            <div className="empty-state"><h3>Selecione um professor para detalhe</h3></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 