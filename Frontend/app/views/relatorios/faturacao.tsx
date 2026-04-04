// Ficheiro: app/views/relatorios/faturacao/faturacao.tsx
import './faturacao.scss';
// Adicionámos o useEffect aos imports do React
import { useState, useMemo, useEffect } from 'react';
import type { LinhaFaturacaoCoaching, FiltroFaturacao } from '~/models/interfaces/faturacao.interface';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonComponent } from '~/components/button/button.component';
// Importámos a barra de pesquisa para o painel esquerdo
import { InputComponent } from '~/components/input/input.component';
import { faturacaoService } from "~/services/faturacao.service";

export function Faturacao() {
    // ==========================================
    // 1. ESTADOS DA APLICAÇÃO (A Memória)
    // ==========================================
    const [filtro, setFiltro] = useState<FiltroFaturacao>({ dataInicio: '', dataFim: '' });
    const [faturas, setFaturas] = useState<LinhaFaturacaoCoaching[]>([]);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
    const [professorSelecionado, setProfessorSelecionado] = useState<string | null>(null);
    const [aCarregar, setACarregar] = useState(false);
    
    // NOVO: Memória para a barra de pesquisa de professores
    const [pesquisaProf, setPesquisaProf] = useState('');

    // ==========================================
    // 2. EFEITOS ESPECIAIS (UX)
    // ==========================================
    // O "Elevador VIP": vigia a variável 'professorSelecionado'. 
    // Quando ela muda, faz scroll suave até ao topo.
    useEffect(() => {
        if (professorSelecionado) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [professorSelecionado]);

    // ==========================================
    // 3. COMUNICAÇÃO COM O BACKEND
    // ==========================================
    const handlePesquisa = async () => {
        if (!filtro.dataInicio || !filtro.dataFim) return alert('Por favor, selecione ambas as datas para realizar a pesquisa.');

        setACarregar(true);

        try {
            const dados = await faturacaoService.getRelatorio(filtro.dataInicio, filtro.dataFim);

            setFaturas(dados);
            setPesquisaRealizada(true);
            setProfessorSelecionado(null); // Resetar seleção ao fazer nova pesquisa
        } catch (error) {
            console.error('Erro ao buscar dados de faturação:', error);
            alert('Ocorreu um erro ao buscar os dados de faturação. Por favor, tente novamente mais tarde.');
        } finally {
            setACarregar(false);
        }
    };

    // ==========================================
    // 4. TRANSFORMAÇÃO DE DADOS (Lógica de Negócio)
    // ==========================================
    // Agrupamento para os Cards da esquerda (Matemática pesada guardada com useMemo)
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

    // NOVO: A lista que o lado esquerdo vai desenhar de facto (já filtrada pelo input)
    const professoresFiltrados = resumoProfessores.filter(p =>
        p.nome.toLowerCase().includes(pesquisaProf.toLowerCase())
    );

    // O professor que está atualmente selecionado
    const profFocado = resumoProfessores.find(p => p.nome === professorSelecionado);
    
    // Dados filtrados e formatados para a tabela da direita
    const tableData = faturas
        .filter(f => f.nomeProfessor === professorSelecionado)
        .map(f => {
            const dataFormatada = new Date(f.dataAula).toLocaleDateString('pt-PT');

            return {
                ...f,
                dataAula: dataFormatada,
                estadoTabela: {
                    value: f.estaPago ? 'Pago' : 'Pendente',
                    infoType: f.estaPago ? 'success' : 'error' 
                }
            };
        });

    // ==========================================
    // 5. O VISUAL (Renderização)
    // ==========================================
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
                <ButtonComponent 
                    label={aCarregar ? "A carregar..." : "Pesquisar"} 
                    disabled={aCarregar}
                    onClick={handlePesquisa} 
                    icon="fa-solid fa-magnifying-glass"
                />
            </div>

            {pesquisaRealizada && (
                <div className="layout-master-detail">
                    {/* PAINEL ESQUERDO: Lista de Professores */}
                    <div className="painel-esquerdo">
                        <h3><i className="fa-solid fa-users"></i> Resumo por Professor</h3>
                        
                        {/* A barra de pesquisa instantânea */}
                        <div style={{ marginBottom: '15px' }}>
                            <InputComponent 
                                id="pesquisa-prof"
                                placeholder="🔍 Procurar professor..."
                                value={pesquisaProf}
                                onChange={(e) => setPesquisaProf(e.target.value)}
                            />
                        </div>

                        <div className="lista-cards">
                            {/* Usamos a lista filtrada em vez da lista completa */}
                            {professoresFiltrados.map(p => (
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

                            {/* Tratamento de erro suave caso não encontre ninguém na pesquisa */}
                            {professoresFiltrados.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                                    Nenhum professor encontrado com esse nome.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* PAINEL DIREITO: Detalhe do Professor (Tabela) */}
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
                            <div className="empty-state">
                                <h3>Selecione um professor para detalhe</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 