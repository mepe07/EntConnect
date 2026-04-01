import React from 'react';
import { AuthService } from '~/services/auth.service';
import './dashboard.scss';

export function Dashboard() {
    const authService = new AuthService();
    const userInfo = authService.getUserInfo();
  
    // LÓGICA: Dar as boas vindas com base no nome do utilizador logado
    const nomeUtilizador = userInfo?.username || "Diretora";

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
                    </div>
                    <div className="painel-corpo acoes-rapidas">
                        <button className="btn-acao"><i className="fa-solid fa-plus"></i> Novo Aluno</button>
                        <button className="btn-acao"><i className="fa-solid fa-file-invoice"></i> Criar Fatura</button>
                        <button className="btn-acao"><i className="fa-solid fa-calendar-plus"></i> Agendar Aula</button>
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