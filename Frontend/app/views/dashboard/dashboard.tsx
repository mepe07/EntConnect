import React, { useState } from 'react';
import { useNavigate } from 'react-router'; // Importar o hook de navegação
import { AuthService } from '~/services/auth.service';
import './dashboard.scss';

export function Dashboard() {
    
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();
    const navigate = useNavigate();

    // LÓGICA: Dar as boas vindas com base no nome do utilizador logado
    const nomeUtilizador = userInfo?.username || "Diretora";

    // ==========================================
    // ESTADOS: AÇÕES RÁPIDAS
    // ==========================================
    // Controla se estamos no "modo de edição" (lápis ativado)
    const [editandoAcoes, setEditandoAcoes] = useState(false);

    // Lista de todas as ações disponíveis no sistema
    const [acoesRapidas, setAcoesRapidas] = useState([
        { id: 1, nome: 'Novo Aluno', icone: 'fa-solid fa-plus', visivel: true, rota: '/admin/utilizadores' },
        { id: 2, nome: 'Criar Fatura', icone: 'fa-solid fa-file-invoice', visivel: true, rota: '/faturas/nova' },
        { id: 3, nome: 'Agendar Aula', icone: 'fa-solid fa-calendar-plus', visivel: true, rota: '/agenda' },
        { id: 5, nome: 'Relatório Mensal', icone: 'fa-solid fa-chart-pie', visivel: false, rota: '/relatorios' },
    ]);

    // Função que inverte a visibilidade de uma ação específica
    const alternarVisibilidade = (id: number) => {
        setAcoesRapidas(acoesAtuais => 
            acoesAtuais.map(acao => 
                acao.id === id ? { ...acao, visivel: !acao.visivel } : acao
            )
        );
    };

    return (
        <div className="dashboard-wrapper">
      
            {/* 1. O TAPETE VERMELHO */}
            <div className="dashboard-boas-vindas">
                <div>
                    <h1>Olá, {nomeUtilizador}! 👋</h1>
                    <p>Aqui está o resumo da tua escola para o dia de hoje.</p>
                </div>
                <div className="data-hoje">
                    {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* 2. OS SINAIS VITAIS (KPIs) */}
            <section className="kpi-grid">
                <div className="kpi-card">
                    <div className="icone azul"><i className="fa-solid fa-user-graduate"></i></div>
                    <div className="info">
                        <span>Alunos Ativos</span>
                        <h3>142</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone verde"><i className="fa-solid fa-euro-sign"></i></div>
                    <div className="info">
                        <span>Receita do Mês</span>
                        <h3>4.250 €</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone vermelho"><i className="fa-solid fa-triangle-exclamation"></i></div>
                    <div className="info">
                        <span>Em Atraso</span>
                        <h3>365 €</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="icone roxo"><i className="fa-solid fa-chalkboard-user"></i></div>
                    <div className="info">
                        <span>Aulas Hoje</span>
                        <h3>8</h3>
                    </div>
                </div>
            </section>

            {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (Dividida em 2 colunas) */}
            <section className="conteudo-principal">
        
                {/* Coluna da Esquerda: Gráfico ou Ações */}
                <div className="painel-grafico">
                    <div className="painel-header">
                        <h2>Ações Rápidas</h2>
                        {/* Botão de Lápis / Visto */}
                        <button 
                            className="btn-icone-acao" 
                            onClick={() => setEditandoAcoes(!editandoAcoes)}
                            title={editandoAcoes ? "Guardar" : "Editar Ações"}
                        >
                            <i className={`fa-solid ${editandoAcoes ? 'fa-check text-green-600' : 'fa-pen text-slate-400'}`}></i>
                        </button>
                    </div>

                    <div className="painel-corpo acoes-rapidas">
                        {editandoAcoes ? (
                            /* MODO EDIÇÃO */
                            <div className="lista-edicao-acoes">
                                {acoesRapidas.map((acao) => (
                                    <div key={acao.id} className={`item-edicao ${acao.visivel ? 'ativo' : 'inativo'}`}>
                                        {/* Ícone e Texto juntos dentro do quadrado */}
                                        <i className={`icone-principal ${acao.icone}`}></i>
                                        <span className="texto-acao">{acao.nome}</span>
                                        
                                        {/* Olho flutuante no canto */}
                                        <button 
                                            onClick={() => alternarVisibilidade(acao.id)}
                                            className="btn-toggle-olho"
                                        >
                                            <i className={`fa-solid ${acao.visivel ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* MODO VISUALIZAÇÃO */
                            <div className="grelha-botoes-acoes">
                                {acoesRapidas.filter(a => a.visivel).length > 0 ? (
                                    acoesRapidas.filter(a => a.visivel).map((acao) => (
                                        <button 
                                            key={acao.id} 
                                            className="btn-acao"
                                            onClick={() => navigate(acao.rota)} //rotas
                                        >
                                            <i className={`icone-principal ${acao.icone}`}></i>
                                            <span className="texto-acao">{acao.nome}</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="texto-vazio-acoes">Não tens ações visíveis. Clica no lápis para adicionar.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna da Direita: Agenda do Dia */}
                <div className="painel-agenda">
                    <div className="painel-header">
                        <h2>Agenda de Hoje</h2>
                        <button className="btn-link">Ver tudo</button>
                    </div>
                    <div className="painel-corpo">
                        <ul className="lista-agenda">
                            <li>
                                <div className="hora">14:00</div>
                                <div className="detalhe">
                                    <strong>Ana Ferreira</strong>
                                    <span>Coaching Vocal | Prof. Mário</span>
                                </div>
                            </li>
                            <li>
                                <div className="hora">15:30</div>
                                <div className="detalhe">
                                    <strong>Tiago Matos</strong>
                                    <span>Iniciação | Profª. Sofia</span>
                                </div>
                            </li>
                            <li>
                                <div className="hora">17:00</div>
                                <div className="detalhe">
                                    <strong>Carlos Silva</strong>
                                    <span>Aperfeiçoamento | Prof. Mário</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

            </section>
        </div>
    );
}