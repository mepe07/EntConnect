import React, { useState, useEffect } from 'react';
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
import './faturacao-atraso.scss';

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
    const [termoPesquisa, setTermoPesquisa] = useState("");
    const [filtroGravidade, setFiltroGravidade] = useState("todos");
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 5;
    const [linhasAbertas, setLinhasAbertas] = useState<number[]>([]);

    useEffect(() => {
        const buscarDados = setTimeout(() => {
            setDevedores([
                { ID_Enc_Educacao: 1, Nome_Enc_Educacao: "Rui Ferreira", Email_Enc_Educacao: "rui@exemplo.pt", Total_Em_Divida: 120.50, Detalhes_Divida: [{ ID_Coaching: 101, Nome_Aluno: "Ana Ferreira", Data_Sessao: "2026-03-20", Montante_Sessao: 60.25, Nome_Professor: "Prof. Mário" }, { ID_Coaching: 102, Nome_Aluno: "Ana Ferreira", Data_Sessao: "2026-03-27", Montante_Sessao: 60.25, Nome_Professor: "Prof. Mário" }] },
                { ID_Enc_Educacao: 2, Nome_Enc_Educacao: "Sara Matos", Email_Enc_Educacao: "sara@exemplo.pt", Total_Em_Divida: 45.00, Detalhes_Divida: [{ ID_Coaching: 103, Nome_Aluno: "Tiago Matos", Data_Sessao: "2026-03-22", Montante_Sessao: 45.00, Nome_Professor: "Profª. Sofia" }] },
                { ID_Enc_Educacao: 3, Nome_Enc_Educacao: "Carlos Silva", Email_Enc_Educacao: "carlos@exemplo.pt", Total_Em_Divida: 200.00, Detalhes_Divida: [{ ID_Coaching: 104, Nome_Aluno: "João Silva", Data_Sessao: "2026-03-10", Montante_Sessao: 200.00, Nome_Professor: "Prof. Mário" }] }
            ]);
            setACarregar(false);
        }, 800);
        return () => clearTimeout(buscarDados);
    }, []);

    const devedoresFiltrados = devedores.filter((ee) => {
        const passaPesquisa = ee.Nome_Enc_Educacao.toLowerCase().includes(termoPesquisa.toLowerCase());
        const passaFiltro = filtroGravidade === "todos" ? true : filtroGravidade === "critico" ? ee.Total_Em_Divida >= 100 : ee.Total_Em_Divida < 100;
        return passaPesquisa && passaFiltro;
    });

    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const devedoresPaginaAtual = devedoresFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(devedoresFiltrados.length / itensPorPagina);
    const valorTotalDivida = devedores.reduce((total, ee) => total + ee.Total_Em_Divida, 0);

    const mediaDivida = devedores.length > 0 ? (valorTotalDivida / devedores.length) : 0;

    const toggleLinha = (id: number) => {
        if (linhasAbertas.includes(id)) {
            setLinhasAbertas(linhasAbertas.filter(linhaId => linhaId !== id));
        } else {
            setLinhasAbertas([...linhasAbertas, id]);
        }
    };

    const limparFiltros = () => {
        setTermoPesquisa("");
        setFiltroGravidade("todos");
    };

    useEffect(() => { setPaginaAtual(1); }, [termoPesquisa, filtroGravidade]);

    return (
        <div className="faturacao-container">
      
            <div className="hero-header">
                <div className="hero-content">
                    <div className="icone-gigante"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                    <div className="textos-hero">
                        <h1>Centro de Faturação</h1>
                        <p>Gerir pagamentos pendentes de forma inteligente e rápida.</p>
                    </div>
                </div>
            </div>

            <div className="kpi-board">
                <div className="kpi-card">
                    <div className="kpi-icone"><i className="fa-solid fa-users"></i></div>
                    <div className="kpi-info">
                        <span className="kpi-titulo">Total de Devedores</span>
                        <span className="kpi-valor">{devedores.length}</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icone"><i className="fa-solid fa-chart-pie"></i></div>
                    <div className="kpi-info">
                        <span className="kpi-titulo">Dívida Média</span>
                        <span className="kpi-valor">{mediaDivida.toFixed(2)} €</span>
                    </div>
                </div>
                <div className="kpi-card destaque">
                    <div className="kpi-icone"><i className="fa-solid fa-triangle-exclamation"></i></div>
                    <div className="kpi-info">
                        <span className="kpi-titulo">Valor Total em Falta</span>
                        <span className="kpi-valor">{valorTotalDivida.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            <div className="toolbar">
                <div className="toolbar-filtros">
                    <div className="filtro-pesquisa">
                        <InputComponent 
                            id="pesquisa-ee" 
                            placeholder="🔍 Procurar por nome..." 
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
                                { value: "critico", label: "🔴 Críticas (≥ 100€)" },
                                { value: "atencao", label: "🟠 Atenção (< 100€)" }
                            ]}
                        />
                    </div>
          
                    {(termoPesquisa !== "" || filtroGravidade !== "todos") && (
                        <button className="btn-limpar" onClick={limparFiltros}>
                            <i className="fa-solid fa-eraser"></i> Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {aCarregar ? (
                <div className="loading-state">A consultar a tesouraria...</div>
            ) : devedoresFiltrados.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🚀</div>
                    <h3>Missão Cumprida!</h3>
                    <p>Não existem pagamentos pendentes com estes critérios.</p>
                    {(termoPesquisa !== "" || filtroGravidade !== "todos") && (
                        <button className="btn-voltar-filtros" onClick={limparFiltros}>
                            Voltar aos filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="tabela-wrapper">
                    <table className="tabela-faturacao">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
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
                    
                                        <tr 
                                            className={`linha-pai ${isAberta ? 'aberta' : ''}`} 
                                            onClick={() => toggleLinha(ee.ID_Enc_Educacao)}
                                        >
                                            <td className="celula-seta">
                                                <i className={`fa-solid fa-chevron-${isAberta ? 'up' : 'down'} icone-seta`}></i>
                                            </td>
                                            <td><strong>{ee.Nome_Enc_Educacao}</strong></td>
                                            <td>{ee.Email_Enc_Educacao}</td>
                                            <td>
                                                <span className={`tag-gravidade ${ee.Total_Em_Divida >= 100 ? 'critico' : 'atencao'}`}>
                                                    {ee.Total_Em_Divida.toFixed(2)} €
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-cobrar" onClick={(e) => { e.stopPropagation(); alert('Abrir modal de cobrança!'); }}>
                                                    <i className="fa-regular fa-paper-plane"></i> Cobrar
                                                </button>
                                            </td>
                                        </tr>

                                        {isAberta && (
                                            <tr className="linha-filha fade-in">
                                                <td colSpan={5}>
                                                    <div className="conteudo-expandido">
                                                        <h4><i className="fa-solid fa-receipt"></i> Detalhe das Sessões:</h4>
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
                                                                        <td><i className="fa-solid fa-user-graduate font-pequena"></i> {sessao.Nome_Aluno}</td>
                                                                        <td><i className="fa-regular fa-calendar font-pequena"></i> {sessao.Data_Sessao}</td>
                                                                        <td>{sessao.Nome_Professor}</td>
                                                                        <td><strong>{sessao.Montante_Sessao.toFixed(2)} €</strong></td>
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

                    {totalPaginas > 1 && (
                        <div className="paginacao">
                            <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>
                                <i className="fa-solid fa-arrow-left"></i> Anterior
                            </button>
                            <span>Página {paginaAtual} de {totalPaginas}</span>
                            <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>
                                Próxima <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 