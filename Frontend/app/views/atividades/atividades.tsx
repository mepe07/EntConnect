// Ficheiro: src/views/atividades/atividades.tsx

import React, { useState, useEffect } from 'react';
import { marketplaceService } from '../../services/marketplace.service';
import { Anuncio, EstadoAnuncio } from '../../types/marketplace.types';
import './atividades.scss';

// Para já, focamos na gestão da montra pessoal. 
// Favoritos e Pedidos voltarão quando a equipa fechar o módulo de Chat e Interesses.
type AbaTipo = 'anuncios';

export function Atividades() { 
    const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('anuncios');
    const [meusAnuncios, setMeusAnuncios] = useState<Anuncio[]>([]); // 👈 Repara no uso da interface Anuncio!
    const [loading, setLoading] = useState(false);

    // Efeito de carregamento inicial
    useEffect(() => {
        carregarMeusAnuncios();
    }, []);

    // Função para extrair o ID do utilizador logado a partir do token
    const getMeuId = () => {
        const token = localStorage.getItem('entconnect_token');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub; // O 'sub' costuma guardar o ID no NestJS
        } catch (e) {
            return null;
        }
    };

    const carregarMeusAnuncios = async () => {
        const meuId = getMeuId();
        if (!meuId) return;

        setLoading(true);
        try {
            // Usa o novo sistema de filtros do serviço do colega!
            const dados = await marketplaceService.listarAnuncios({ idCriador: meuId });
            setMeusAnuncios(dados);
        } catch (error: any) {
            console.error("Erro ao carregar anúncios:", error);
        } finally {
            setLoading(false);
        }
    };

    // Função para o dono alterar o estado da peça (OLX style)
    const handleMudarEstado = async (idArtigo: number, novoEstado: EstadoAnuncio) => {
        if (!window.confirm(`Tens a certeza que queres marcar este anúncio como ${novoEstado}?`)) return;

        try {
            await marketplaceService.alterarEstado(idArtigo, novoEstado);
            alert(`Anúncio marcado como ${novoEstado} com sucesso!`);
            carregarMeusAnuncios(); // Recarrega a lista para atualizar a cor das etiquetas
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    // Função para apagar definitivamente
    const handleRemoverAnuncio = async (idArtigo: number) => {
        if (!window.confirm("Aviso: Queres mesmo apagar este anúncio para sempre?")) return;

        try {
            await marketplaceService.removerAnuncio(idArtigo);
            setMeusAnuncios(prev => prev.filter(a => a.ID_Artigo !== idArtigo));
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    const renderEtiquetaEstado = (estado: EstadoAnuncio) => {
        switch (estado) {
            case EstadoAnuncio.ATIVO: return <span className="etiqueta verde">Ativo na Montra</span>;
            case EstadoAnuncio.RESERVADO: return <span className="etiqueta amarela">Reservado</span>;
            case EstadoAnuncio.CONCLUIDO: return <span className="etiqueta cinzenta" style={{ background: '#e2e8f0', color: '#475569' }}>Concluído</span>;
            case EstadoAnuncio.REMOVIDO: return <span className="etiqueta vermelha">Removido (Moderação)</span>;
            default: return <span className="etiqueta">{estado}</span>;
        }
    };

    return (
        <div className="atividades-container"> 
            <aside className="atividades-sidebar">
                <h2>A Minha Mochila</h2>
                <nav>
                    <button className={abaAtiva === 'anuncios' ? 'ativo' : ''} onClick={() => setAbaAtiva('anuncios')}>
                        🏪 Os Meus Anúncios
                    </button>
                    {/* Botões de Favoritos e Pedidos ocultos temporariamente até o Chat estar ligado */}
                </nav>
            </aside>

            <main className="atividades-conteudo">
                {loading ? (
                    <div className="mensagem-centro">A carregar a tua montra...</div>
                ) : (
                    <div className="cartao-branco">
                        <section>
                            <div className="titulo-com-acao">
                                <h3>O Que Tenho à Venda / Emprestar</h3>
                            </div>
                            
                            {meusAnuncios.length === 0 ? (
                                <p className="texto-vazio">Não tens anúncios ativos. Que tal começares hoje?</p>
                            ) : (
                                <div className="lista-anuncios">
                                    {meusAnuncios.map(anuncio => (
                                        <div key={anuncio.ID_Artigo} className="item-anuncio" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <div className="info">
                                                    <strong style={{ fontSize: '1.2rem' }}>{anuncio.Nome}</strong>
                                                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                                                        {renderEtiquetaEstado(anuncio.Estado_Anuncio)}
                                                        <span style={{ fontSize: '0.85rem', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                            {anuncio.Tipo_Anuncio.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Botão de Eliminar no canto superior direito */}
                                                <button 
                                                    onClick={() => handleRemoverAnuncio(anuncio.ID_Artigo)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                                                    title="Apagar Anúncio"
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            {/* Painel de Ações do OLX (Alterar Estados) */}
                                            {anuncio.Estado_Anuncio !== EstadoAnuncio.CONCLUIDO && anuncio.Estado_Anuncio !== EstadoAnuncio.REMOVIDO && (
                                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                                    
                                                    {anuncio.Estado_Anuncio === EstadoAnuncio.ATIVO && (
                                                        <button 
                                                            className="btn-secundario" 
                                                            onClick={() => handleMudarEstado(anuncio.ID_Artigo, EstadoAnuncio.RESERVADO)}
                                                        >
                                                            ⏳ Marcar como Reservado
                                                        </button>
                                                    )}

                                                    {anuncio.Estado_Anuncio === EstadoAnuncio.RESERVADO && (
                                                        <button 
                                                            className="btn-secundario" 
                                                            onClick={() => handleMudarEstado(anuncio.ID_Artigo, EstadoAnuncio.ATIVO)}
                                                        >
                                                            🔄 Voltar a Ativo
                                                        </button>
                                                    )}

                                                    <button 
                                                        className="btn-primario" 
                                                        style={{ marginLeft: 'auto', background: '#10b981' }}
                                                        onClick={() => handleMudarEstado(anuncio.ID_Artigo, EstadoAnuncio.CONCLUIDO)}
                                                    >
                                                        ✅ Marcar como Concluído
                                                    </button>
                                                </div>
                                            )}

                                            {/* Mensagem da Moderação */}
                                            {anuncio.Estado_Anuncio === EstadoAnuncio.REMOVIDO && (
                                                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.8rem', borderRadius: '8px', width: '100%', fontSize: '0.9rem' }}>
                                                    <strong>Aviso da Coordenação:</strong> Este anúncio foi removido da plataforma.
                                                </div>
                                            )}

                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
} 