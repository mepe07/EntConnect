// Ficheiro: views/coaching/faturacao-atraso/faturacao-atraso.tsx

import React, { useState, useEffect } from 'react';
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
import './faturacao-atraso.scss';

// ... (As tuas interfaces DetalheDivida e Encarregado mantêm-se iguais) ...
interface DetalheDivida {
    ID_Coaching: number;
    Nome_Aluno: string;
    Montante_Sessao: number;
    Nome_Professor: string;
    Data_Sessao: string;
}

interface Encarregado {
    ID_Enc_Educacao: number;
    Nome_Enc_Educacao: string;
    Email_Enc_Educacao: string;
    Total_Em_Divida: number;
    Detalhes_Divida: DetalheDivida[];
}

export function FaturacaoAtraso() {
    const [devedores, setDevedores] = useState<Encarregado[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    // ESTADOS DA BARRA DE FERRAMENTAS (Ideia 4)
    const [termoPesquisa, setTermoPesquisa] = useState("");
    const [filtroGravidade, setFiltroGravidade] = useState("todos");

    // ESTADO DA PAGINAÇÃO (Ideia 9)
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 5;

    // ESTADO DO ACORDEÃO / LINHAS EXPANSÍVEIS (Ideia 2)
    const [linhasAbertas, setLinhasAbertas] = useState<number[]>([]);

    useEffect(() => {
        // Adicionei mais uns dados falsos para podermos testar a paginação e os filtros!
        const buscarDados = setTimeout(() => {
            setDevedores([
                {
                    ID_Enc_Educacao: 1, Nome_Enc_Educacao: "Rui Ferreira", Email_Enc_Educacao: "rui@exemplo.pt", Total_Em_Divida: 120.50,
                    Detalhes_Divida: [{ ID_Coaching: 101, Nome_Aluno: "Ana Ferreira", Data_Sessao: "2026-03-20", Montante_Sessao: 60.25, Nome_Professor: "Prof. Mário" }, { ID_Coaching: 102, Nome_Aluno: "Ana Ferreira", Data_Sessao: "2026-03-27", Montante_Sessao: 60.25, Nome_Professor: "Prof. Mário" }]
                },
                {
                    ID_Enc_Educacao: 2, Nome_Enc_Educacao: "Sara Matos", Email_Enc_Educacao: "sara@exemplo.pt", Total_Em_Divida: 45.00,
                    Detalhes_Divida: [{ ID_Coaching: 103, Nome_Aluno: "Tiago Matos", Data_Sessao: "2026-03-22", Montante_Sessao: 45.00, Nome_Professor: "Profª. Sofia" }]
                },
                {
                    ID_Enc_Educacao: 3, Nome_Enc_Educacao: "Carlos Silva", Email_Enc_Educacao: "carlos@exemplo.pt", Total_Em_Divida: 200.00,
                    Detalhes_Divida: [{ ID_Coaching: 104, Nome_Aluno: "João Silva", Data_Sessao: "2026-03-10", Montante_Sessao: 200.00, Nome_Professor: "Prof. Mário" }]
                }
            ]);
            setACarregar(false);
        }, 800);
        return () => clearTimeout(buscarDados);
    }, []);

    // --- LÓGICA DE PROCESSAMENTO DOS DADOS ---

    // 1. Filtrar os dados consoante a pesquisa e a SelectBox
    const devedoresFiltrados = devedores.filter((ee) => {
        const passaPesquisa = ee.Nome_Enc_Educacao.toLowerCase().includes(termoPesquisa.toLowerCase());
        const passaFiltro = 
            filtroGravidade === "todos" ? true :
                filtroGravidade === "critico" ? ee.Total_Em_Divida >= 100 :
                    ee.Total_Em_Divida < 100; // "atencao"
    
        return passaPesquisa && passaFiltro;
    });

    // 2. Matemática da Paginação
    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const devedoresPaginaAtual = devedoresFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(devedoresFiltrados.length / itensPorPagina);

    // 3. Matemática dos KPIs (Ideia 7)
    const valorTotalDivida = devedores.reduce((total, ee) => total + ee.Total_Em_Divida, 0);

    // 4. Lógica de abrir/fechar o acordeão
    const toggleLinha = (id: number) => {
        if (linhasAbertas.includes(id)) {
            setLinhasAbertas(linhasAbertas.filter(linhaId => linhaId !== id)); // Remove o ID (Fecha)
        } else {
            setLinhasAbertas([...linhasAbertas, id]); // Adiciona o ID (Abre)
        }
    };

    // 5. Resetar a página para 1 sempre que se faz uma pesquisa nova
    useEffect(() => { setPaginaAtual(1); }, [termoPesquisa, filtroGravidade]);

    // --- RENDERIZAÇÃO DO ECRÃ ---
    return (
        <div className="faturacao-container">
      
            <header className="faturacao-header">
                <h1>Centro de Faturação</h1>
                <p>Gestão de pagamentos pendentes das sessões de Coaching.</p>
            </header>

            {/* IDEIA 7: Mini-Dashboard (KPIs) */}
            <div className="kpi-board">
                <div className="kpi-card">
                    <span className="kpi-titulo">Total de Devedores</span>
                    <span className="kpi-valor">{devedores.length}</span>
                </div>
                <div className="kpi-card destaque">
                    <span className="kpi-titulo">Valor Total em Falta</span>
                    <span className="kpi-valor">{valorTotalDivida.toFixed(2)} €</span>
                </div>
            </div>

            {/* IDEIA 4: Barra de Ferramentas (Toolbar) */}
            <div className="toolbar">
                <div className="toolbar-filtros">
                    <div className="filtro-pesquisa">
                        <InputComponent 
                            id="pesquisa-ee" 
                            placeholder="Procurar por nome..." 
                            value={termoPesquisa} 
                            onChange={(e) => setTermoPesquisa(e.target.value)} 
                        />
                    </div>
                    <div className="filtro-gravidade">
                        <SelectBoxComponent
                            id="filtro-grav"
                            selectedOption={filtroGravidade}
                            onChange={(e) => setFiltroGravidade(e.target.value)}
                            options={[
                                { value: "todos", label: "Todas as dívidas" },
                                { value: "critico", label: "Críticas (≥ 100€)" },
                                { value: "atencao", label: "Atenção (< 100€)" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* IDEIA 10: Empty State */}
            {aCarregar ? (
                <div className="loading-state">A consultar a tesouraria...</div>
            ) : devedoresFiltrados.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎉</div>
                    <h3>Tudo limpo!</h3>
                    <p>Não encontrámos dívidas com estes filtros.</p>
                </div>
            ) : (
                <div className="tabela-wrapper">
          
                    {/* IDEIA 1: A Tabela Mestra */}
                    <table className="tabela-faturacao">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}></th> {/* Espaço para a setinha */}
                                <th>Encarregado</th>
                                <th>Contacto</th>
                                <th>Dívida Total</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
            
                        <tbody>
                            {devedoresPaginaAtual.map((ee) => {
                                const isAberta = linhasAbertas.includes(ee.ID_Enc_Educacao);
                
                                return (
                                    <React.Fragment key={ee.ID_Enc_Educacao}>
                                        {/* LINHA PRINCIPAL */}
                                        <tr className={`linha-pai ${isAberta ? 'aberta' : ''}`}>
                                            <td className="celula-seta" onClick={() => toggleLinha(ee.ID_Enc_Educacao)}>
                                                <i className={`fa-solid fa-chevron-${isAberta ? 'up' : 'down'}`}></i>
                                            </td>
                                            <td onClick={() => toggleLinha(ee.ID_Enc_Educacao)}>
                                                <strong>{ee.Nome_Enc_Educacao}</strong>
                                            </td>
                                            <td>{ee.Email_Enc_Educacao}</td>
                                            <td>
                                                {/* IDEIA 8: Termómetro de Gravidade */}
                                                <span className={`tag-gravidade ${ee.Total_Em_Divida >= 100 ? 'critico' : 'atencao'}`}>
                                                    {ee.Total_Em_Divida.toFixed(2)} €
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-cobrar">Cobrar</button>
                                            </td>
                                        </tr>

                                        {/* IDEIA 2: Linha Expansível (Sub-tabela escondida) */}
                                        {isAberta && (
                                            <tr className="linha-filha">
                                                <td colSpan={5}>
                                                    <div className="conteudo-expandido">
                                                        <h4>Detalhe das Sessões:</h4>
                                                        <table className="sub-tabela">
                                                            <thead>
                                                                <tr>
                                                                    <th>Aluno</th>
                                                                    <th>Data</th>
                                                                    <th>Professor</th>
                                                                    <th>Valor</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {ee.Detalhes_Divida.map(sessao => (
                                                                    <tr key={sessao.ID_Coaching}>
                                                                        <td>{sessao.Nome_Aluno}</td>
                                                                        <td>{sessao.Data_Sessao}</td>
                                                                        <td>{sessao.Nome_Professor}</td>
                                                                        <td>{sessao.Montante_Sessao.toFixed(2)} €</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* IDEIA 9: Paginação */}
                    {totalPaginas > 1 && (
                        <div className="paginacao">
                            <button 
                                disabled={paginaAtual === 1} 
                                onClick={() => setPaginaAtual(paginaAtual - 1)}
                            >
                                Anterior
                            </button>
                            <span>Página {paginaAtual} de {totalPaginas}</span>
                            <button 
                                disabled={paginaAtual === totalPaginas} 
                                onClick={() => setPaginaAtual(paginaAtual + 1)}
                            >
                                Próxima
                            </button>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
} 