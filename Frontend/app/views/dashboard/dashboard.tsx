import React, { useState } from 'react';
import { useNavigate } from 'react-router'; 
import { AuthService } from '~/services/auth.service';
import './dashboard.scss';

export function Dashboard() {
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();
    const navigate = useNavigate();

    const nomeUtilizador = userInfo?.username || "Diretora";

    // ==========================================
    // ESTADOS: AÇÕES RÁPIDAS
    // ==========================================
    const [editandoAcoes, setEditandoAcoes] = useState(false);

    const [acoesRapidas, setAcoesRapidas] = useState([
        { id: 1, nome: 'Novo Aluno', icone: 'fa-solid fa-plus', visivel: true, rota: '/admin/utilizadores' },
        { id: 2, nome: 'Criar Fatura', icone: 'fa-solid fa-file-invoice', visivel: true, rota: '/faturas/nova' },
        { id: 3, nome: 'Agendar Aula', icone: 'fa-solid fa-calendar-plus', visivel: true, rota: '/agenda' },
        { id: 5, nome: 'Relatório Mensal', icone: 'fa-solid fa-chart-pie', visivel: false, rota: '/relatorios' },
    ]);

    const alternarVisibilidade = (id: number) => {
        setAcoesRapidas(acoesAtuais => 
            acoesAtuais.map(acao => 
                acao.id === id ? { ...acao, visivel: !acao.visivel } : acao
            )
        );
    };

    return (
        <div className="dashboard-wrapper">
      
            {/* 1. TOPO: BOAS VINDAS (Esquerda) E AÇÕES RÁPIDAS (Direita) */}
            <div className="dashboard-topo">
                <div className="dashboard-boas-vindas">
                    <h1>Olá, {nomeUtilizador}! 👋</h1>
                    <p>Aqui está o resumo para hoje, {new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                </div>

                {/* AÇÕES RÁPIDAS COMPACTAS */}
                <div className="acoes-rapidas-container">
                    <div className="botoes-acoes-topo">
                        {acoesRapidas.filter(a => a.visivel).map((acao) => (
                            <button 
                                key={acao.id} 
                                className="btn-acao-mini" 
                                onClick={() => navigate(acao.rota)}
                                title={acao.nome}
                            >
                                <i className={acao.icone}></i>
                            </button>
                        ))}
                        
                        {/* Botão de Editar */}
                        <button 
                            className={`btn-acao-mini editar ${editandoAcoes ? 'ativo' : ''}`} 
                            onClick={() => setEditandoAcoes(!editandoAcoes)}
                            title="Editar Ações"
                        >
                            <i className={`fa-solid ${editandoAcoes ? 'fa-check' : 'fa-pen'}`}></i>
                        </button>
                    </div>

                    {/* MENU SUSPENSO DE EDIÇÃO DAS AÇÕES */}
                    {editandoAcoes && (
                        <div className="menu-edicao-acoes">
                            <h4>Personalizar Ações</h4>
                            {acoesRapidas.map((acao) => (
                                <div key={acao.id} className="item-edicao-mini">
                                    <span><i className={acao.icone}></i> {acao.nome}</span>
                                    <button onClick={() => alternarVisibilidade(acao.id)}>
                                        <i className={`fa-solid ${acao.visivel ? 'fa-toggle-on text-green-600' : 'fa-toggle-off text-slate-400'}`}></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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
        
                {/* NOVA COLUNA DA ESQUERDA: Eventos e Avisos */}
                <div className="painel-destaques">
                    
                    {/* PRÓXIMOS EVENTOS */}
                    <div className="painel-header">
                        <h2>Próximos Eventos</h2>
                        <button className="btn-link">Ver Calendário</button>
                    </div>
                    <div className="painel-corpo lista-eventos">
                        <div className="evento-card">
                            <div className="evento-data destaque">
                                <span className="dia">15</span>
                                <span className="mes">Jun</span>
                            </div>
                            <div className="evento-info">
                                <h4>Gala de Verão Zumba</h4>
                                <p><i className="fa-solid fa-location-dot"></i> Pavilhão Municipal</p>
                            </div>
                            <span className="tag-evento">Espetáculo</span>
                        </div>

                        <div className="evento-card">
                            <div className="evento-data">
                                <span className="dia">22</span>
                                <span className="mes">Jun</span>
                            </div>
                            <div className="evento-info">
                                <h4>Masterclass de Dança Contemporânea</h4>
                                <p><i className="fa-solid fa-clock"></i> 14:30 - Estúdio 1</p>
                            </div>
                            <span className="tag-evento">Workshop</span>
                        </div>
                    </div>

                    {/* QUADRO DE AVISOS */}
                    <div className="painel-header mt-4">
                        <h2>Quadro de Avisos</h2>
                    </div>
                    <div className="painel-corpo lista-avisos">
                        <div className="aviso-item">
                            <div className="aviso-icone aviso"><i className="fa-solid fa-circle-exclamation"></i></div>
                            <div className="aviso-texto">
                                <strong>Manutenção do Estúdio 2</strong>
                                <span>O chão do Estúdio 2 será envernizado na próxima terça-feira. Aulas transferidas.</span>
                            </div>
                        </div>
                        <div className="aviso-item">
                            <div className="aviso-icone sucesso"><i className="fa-solid fa-bullhorn"></i></div>
                            <div className="aviso-texto">
                                <strong>Abertura de Inscrições</strong>
                                <span>As inscrições para a nova turma de Hip-Hop já estão abertas no portal.</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* COLUNA DA DIREITA: Agenda do Dia (Mantida igual) */}
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