// Ficheiro: app/views/dashboard/dashboard.tsx

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AuthService } from '~/services/auth.service';
import { ResumoEventosDashboard } from '~/components/eventos/resumo-eventos-dashboard.component';
import './dashboard.scss';

type AcaoRapida = {
    id: number;
    nome: string;
    icone: string;
    visivel: boolean;
    rota: string;
};

const ACOES_RAPIDAS_INICIAIS: AcaoRapida[] = [
    {
        id: 1,
        nome: 'Novo Aluno',
        icone: 'fa-solid fa-plus',
        visivel: true,
        rota: '/admin/utilizadores',
    },
    {
        id: 2,
        nome: 'Criar Fatura',
        icone: 'fa-solid fa-file-invoice',
        visivel: true,
        rota: '/faturas/nova',
    },
    {
        id: 3,
        nome: 'Agendar Aula',
        icone: 'fa-solid fa-calendar-plus',
        visivel: true,
        rota: '/agenda',
    },
    {
        id: 4,
        nome: 'Relatório Mensal',
        icone: 'fa-solid fa-chart-pie',
        visivel: false,
        rota: '/relatorios',
    },
];

export function Dashboard() {
    const navigate = useNavigate();

    const authService = new AuthService();
    const userInfo = authService.getUserInfo();

    const nomeUtilizador = userInfo?.username || 'Diretora';

    const [editandoAcoes, setEditandoAcoes] = useState(false);
    const [acoesRapidas, setAcoesRapidas] = useState<AcaoRapida[]>(
        ACOES_RAPIDAS_INICIAIS
    );

    const dataHoje = useMemo(() => {
        return new Date().toLocaleDateString('pt-PT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }, []);

    const acoesVisiveis = useMemo(() => {
        return acoesRapidas.filter((acao) => acao.visivel);
    }, [acoesRapidas]);

    function alternarVisibilidade(id: number) {
        setAcoesRapidas((acoesAtuais) =>
            acoesAtuais.map((acao) =>
                acao.id === id
                    ? {
                          ...acao,
                          visivel: !acao.visivel,
                      }
                    : acao
            )
        );
    }

    function navegarParaAcao(rota: string) {
        navigate(rota);
    }

    return (
        <main className="dashboard-wrapper">
            {/* 1. TOPO DA DASHBOARD */}
            <section className="dashboard-topo">
                <div className="dashboard-boas-vindas">
                    <h1>Olá, {nomeUtilizador}! 👋</h1>
                    <p>Aqui está o resumo para hoje, {dataHoje}.</p>
                </div>

                {/* Ações rápidas compactas.
                    Mantemos isto separado dos eventos para não misturar responsabilidades. */}
                <div className="acoes-rapidas-container">
                    <div className="botoes-acoes-topo">
                        {acoesVisiveis.map((acao) => (
                            <button
                                key={acao.id}
                                type="button"
                                className="btn-acao-mini"
                                onClick={() => navegarParaAcao(acao.rota)}
                                title={acao.nome}
                                aria-label={acao.nome}
                            >
                                <i className={acao.icone}></i>
                            </button>
                        ))}

                        <button
                            type="button"
                            className={`btn-acao-mini editar ${
                                editandoAcoes ? 'ativo' : ''
                            }`}
                            onClick={() => setEditandoAcoes((valorAtual) => !valorAtual)}
                            title="Editar ações rápidas"
                            aria-label="Editar ações rápidas"
                            aria-expanded={editandoAcoes}
                        >
                            <i
                                className={`fa-solid ${
                                    editandoAcoes ? 'fa-check' : 'fa-pen'
                                }`}
                            ></i>
                        </button>
                    </div>

                    {editandoAcoes && (
                        <div className="menu-edicao-acoes">
                            <h4>Personalizar ações</h4>

                            {acoesRapidas.map((acao) => (
                                <div key={acao.id} className="item-edicao-mini">
                                    <span>
                                        <i className={acao.icone}></i>
                                        {acao.nome}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => alternarVisibilidade(acao.id)}
                                        aria-label={`Alternar visibilidade de ${acao.nome}`}
                                        aria-pressed={acao.visivel}
                                    >
                                        <i
                                            className={`fa-solid ${
                                                acao.visivel
                                                    ? 'fa-toggle-on toggle-on'
                                                    : 'fa-toggle-off toggle-off'
                                            }`}
                                        ></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 2. KPIs DA DASHBOARD */}
            <section className="kpi-grid">
                <article className="kpi-card">
                    <div className="icone azul">
                        <i className="fa-solid fa-user-graduate"></i>
                    </div>

                    <div className="info">
                        <span>Alunos Ativos</span>
                        <h3>142</h3>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="icone verde">
                        <i className="fa-solid fa-euro-sign"></i>
                    </div>

                    <div className="info">
                        <span>Receita do Mês</span>
                        <h3>4.250 €</h3>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="icone vermelho">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div className="info">
                        <span>Em Atraso</span>
                        <h3>365 €</h3>
                    </div>
                </article>

                <article className="kpi-card">
                    <div className="icone roxo">
                        <i className="fa-solid fa-chalkboard-user"></i>
                    </div>

                    <div className="info">
                        <span>Aulas Hoje</span>
                        <h3>8</h3>
                    </div>
                </article>
            </section>

            {/* 3. EVENTOS REAIS DA DASHBOARD */}
            <ResumoEventosDashboard />
        </main>
    );
}