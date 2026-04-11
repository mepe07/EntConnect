import React, { useState, useEffect } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import './perfil.scss';

type AbaTipo = 'favoritos' | 'pedidos' | 'anuncios';

export function Perfil() {
    const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('pedidos');
    const [meusPedidos, setMeusPedidos] = useState<any[]>([]);
    const [meusAnuncios, setMeusAnuncios] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [abaAtiva]);

    const carregarDados = async () => {
        if (abaAtiva === 'favoritos') return;

        setLoading(true);
        try {
            if (abaAtiva === 'pedidos') {
                const dados = await marketplaceService.listarMeusPedidos();
                setMeusPedidos(dados);
            } else if (abaAtiva === 'anuncios') {
                const dados = await marketplaceService.listarMeusAnuncios();
                setMeusAnuncios(dados);
            }
        } catch (error: any) {
            console.error("Erro ao carregar dados do perfil:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderEtiquetaEstado = (estado: string) => {
        const classe = estado.toLowerCase() === 'aprovado' ? 'verde' : 
            estado.toLowerCase() === 'rejeitado' ? 'vermelha' : 'amarela';
        return <span className={`etiqueta ${classe}`}>{estado}</span>;
    };

    return (
        <div className="perfil-container">
            <aside className="perfil-sidebar">
                <h2>A Minha Mochila</h2>
                <nav>
                    <button className={abaAtiva === 'favoritos' ? 'ativo' : ''} onClick={() => setAbaAtiva('favoritos')}>
                        ❤️ Favoritos
                    </button>
                    <button className={abaAtiva === 'pedidos' ? 'ativo' : ''} onClick={() => setAbaAtiva('pedidos')}>
                        📋 Os Meus Pedidos
                    </button>
                    <button className={abaAtiva === 'anuncios' ? 'ativo' : ''} onClick={() => setAbaAtiva('anuncios')}>
                        🏪 Os Meus Anúncios
                    </button>
                </nav>
            </aside>

            <main className="perfil-conteudo">
                {loading ? (
                    <div className="mensagem-centro">A organizar os teus pertences...</div>
                ) : (
                    <div className="cartao-branco">
                        {abaAtiva === 'favoritos' && (
                            <section>
                                <h3>Os Teus Favoritos</h3>
                                <p className="texto-vazio">Ainda estamos a ligar os cabos aos favoritos. Brevemente aqui! 🚧</p>
                            </section>
                        )}

                        {abaAtiva === 'pedidos' && (
                            <section>
                                <h3>Pedidos de Interesse</h3>
                                {meusPedidos.length === 0 ? (
                                    <p className="texto-vazio">Ainda não demonstraste interesse em nada. Explora o Marketplace!</p>
                                ) : (
                                    <table className="tabela-custom">
                                        <thead>
                                            <tr>
                                                <th>Artigo</th>
                                                <th>Data</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {meusPedidos.map(p => (
                                                <tr key={p.ID_Interesse}>
                                                    <td>{p.Stock_Armazem?.Artigo?.Nome}</td>
                                                    <td>{new Date(p.Data_Registo).toLocaleDateString('pt-PT')}</td>
                                                    <td>{renderEtiquetaEstado(p.Estado)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        )}

                        {abaAtiva === 'anuncios' && (
                            <section>
                                <div className="titulo-com-acao">
                                    <h3>O Que Tenho à Venda</h3>
                                    <button className="btn-primario">➕ Novo Anúncio</button>
                                </div>
                                {meusAnuncios.length === 0 ? (
                                    <p className="texto-vazio">Não tens nada à venda. Que tal começares hoje?</p>
                                ) : (
                                    <div className="lista-anuncios-perfil">
                                        {meusAnuncios.map(a => (
                                            <div key={a.ID_Artigo} className="item-anuncio">
                                                <div className="info">
                                                    <strong>{a.Nome}</strong>
                                                    <span>Stock: {a.Stock_Armazem?.[0]?.Quantidade_Venda || 0} unidades</span>
                                                </div>
                                                <button className="btn-secundario">Gerir Interessados</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
} 