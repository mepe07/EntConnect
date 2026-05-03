import React, { useEffect, useState } from 'react';
import { profConfirmacoesService } from '~/services/profConfirmacoes.service';
import './confirmacoes.scss';

export default function Confirmacoes() {
    const [sessoes, setSessoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadSessoes = async () => {
        setLoading(true);
        try {
            const data = await profConfirmacoesService.getSessoesPendentes();
            setSessoes(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessoes();
    }, []);

    const handleConfirmar = async (id: number) => {
        if (!window.confirm("Confirma que esta sessão foi realizada com sucesso?")) return;

        try {
            // 1. Avisa o backend que a sessão foi realizada
            await profConfirmacoesService.confirmarSessao(id);

            // 3. A MAGIA: Removemos a sessão da lista imediatamente no ecrã!
            setSessoes((sessoesAnteriores) => 
                sessoesAnteriores.filter((sessao) => sessao.idCoaching !== id)
            );
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Função para formatar o horário de início e fim
    const formatHorario = (dataIso: string, duracaoMinutos: number) => {
        const data = new Date(dataIso);
        const horaInicio = data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        if (!duracaoMinutos) return horaInicio;
        
        const dataFim = new Date(data.getTime() + duracaoMinutos * 60000);
        const horaFim = dataFim.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        return `${horaInicio} - ${horaFim}`;
    };

    // Filtragem das sessões baseada na pesquisa
    const sessoesFiltradas = sessoes.filter((sessao) => {
        const termo = searchTerm.toLowerCase();
        return (
            sessao.modalidade?.toLowerCase().includes(termo) || 
            sessao.sala?.toLowerCase().includes(termo)
        );
    });

    if (loading) return <div className="confirmacoes-status">A carregar sessões para confirmar...</div>;

    return (
        <div className="confirmacoes-container">
            <div className="view-header">
                <h1>Confirmações de Coaching</h1>
                <p>Estas são as sessões já passadas que ainda precisam de confirmação.</p>
            </div>

            {error && <div className="status-error">{error}</div>}

            {/* BARRA DE PESQUISA */}
            <div className="search-section">
                <label>Pesquisa</label>
                <input 
                    type="text" 
                    placeholder="Procurar por palavra-chave" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* TABELA DE CONFIRMAÇÕES */}
            <div className="table-wrapper">
                <table className="tabela-confirmacoes">
                    <thead>
                        <tr>
                            <th>DATA</th>
                            <th>HORÁRIO</th>
                            <th>MODALIDADE</th>
                            <th>ESTADO</th>
                            <th>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessoesFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="empty-state">
                                    Nenhuma sessão pendente encontrada.
                                </td>
                            </tr>
                        ) : (
                            sessoesFiltradas.map((sessao) => (
                                <tr key={sessao.idCoaching}>
                                    <td>{new Date(sessao.dataInicio).toLocaleDateString('pt-PT')}</td>
                                    <td>{formatHorario(sessao.dataInicio, sessao.duracaoMinutos)}</td>
                                    <td>{sessao.modalidade}</td>
                                    <td>{sessao.estado}</td>
                                    <td className="acoes-celula">
                                        <button 
                                            className="btn-acao btn-sucesso" 
                                            onClick={() => handleConfirmar(sessao.idCoaching)}
                                            title="Confirmar que a sessão foi realizada"
                                        >
                                            <i className="fa-solid fa-check"></i>
                                        </button>
                                        <button className="btn-acao btn-perigo" title="Marcar como não realizada">
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}