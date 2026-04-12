// Ficheiro: src/views/Marketplace/Marketplace.tsx

import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import type { LoteMarketplace } from '../../models/interfaces/artigo.interface';
import './marketplace.scss';

export function Marketplace() {
    const [anuncios, setAnuncios] = useState<any[]>([]); // Usamos any temporariamente para não dar erro se faltar o Quantidade_Aluguer na interface
    const [loading, setLoading] = useState(true);
    
    // Estados da Pesquisa Avançada
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [filtroTamanho, setFiltroTamanho] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [favoritos, setFavoritos] = useState<number[]>([]);

    // ==========================================
    // NOVOS ESTADOS: O Modal de Aluguer
    // ==========================================
    // Guarda os dados da peça que o utilizador quer alugar e controla se a janela está aberta
    const [modalAluguer, setModalAluguer] = useState<{ aberto: boolean; lote: any | null }>({ aberto: false, lote: null });
    const [dataDevolucao, setDataDevolucao] = useState('');

    useEffect(() => {
        carregarMarketplace();
    }, []);

    const carregarMarketplace = async () => {
        try {
            setLoading(true);
            const dados = await marketplaceService.listarMarketplace();
            setAnuncios(dados);
        } catch (error: any) {
            alert('Erro ao carregar o marketplace: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorito = async (idStock: number) => {
        try {
            const resposta = await marketplaceService.alternarFavorito(idStock);
            if (resposta.status === 'adicionado') setFavoritos(prev => [...prev, idStock]);
            else setFavoritos(prev => prev.filter(id => id !== idStock));
        } catch (error: any) {
            alert('Erro ao guardar favorito: ' + error.message);
        }
    };

    const handleInteresse = async (nomeArtigo: string, idStock: number) => {
        const confirmacao = window.confirm(`Queres enviar um pedido de compra para o artigo: ${nomeArtigo}?`);
        if (!confirmacao) return;

        try {
            await marketplaceService.registarInteresse(idStock, "Estou interessado na compra deste artigo.");
            alert('✅ Pedido de compra registado com sucesso!');
        } catch (error: any) {
            alert('❌ Erro: ' + error.message);
        }
    };

    // ==========================================
    // A LÓGICA DO ALUGUER
    // ==========================================
    const abrirModalAluguer = (lote: any) => {
        setModalAluguer({ aberto: true, lote: lote });
        setDataDevolucao(''); // Limpa a data de um pedido anterior
    };

    const fecharModalAluguer = () => {
        setModalAluguer({ aberto: false, lote: null });
        setDataDevolucao('');
    };

    const confirmarAluguer = async () => {
        if (!dataDevolucao) {
            alert("⚠️ Por favor, seleciona uma data de devolução.");
            return;
        }

        try {
            await marketplaceService.alugarArtigo(modalAluguer.lote.ID_Stock, dataDevolucao);
            alert('📅 Pedido de aluguer enviado com sucesso!');
            fecharModalAluguer();
            carregarMarketplace(); // Recarrega a montra
        } catch (error: any) {
            alert('❌ Erro ao alugar: ' + error.message);
        }
    };

    // Impede o utilizador de escolher datas no passado no calendário (Truque de HTML5)
    const obterDataMinima = () => {
        const hoje = new Date();
        return hoje.toISOString().split('T')[0]; // Devolve no formato YYYY-MM-DD
    };

    // ==========================================
    // FILTRAGEM
    // ==========================================
    const anunciosFiltrados = anuncios.filter(anuncio => {
        const matchTexto = anuncio.Artigo.Nome.toLowerCase().includes(termoPesquisa.toLowerCase());
        const matchTamanho = filtroTamanho ? anuncio.Tamanho?.Descricao === filtroTamanho : true;
        const matchEstado = filtroEstado ? anuncio.Estado?.Descricao === filtroEstado : true;
        return matchTexto && matchTamanho && matchEstado;
    });

    const tamanhosDisponiveis = Array.from(new Set(anuncios.map(a => a.Tamanho?.Descricao).filter(Boolean)));
    const estadosDisponiveis = Array.from(new Set(anuncios.map(a => a.Estado?.Descricao).filter(Boolean)));

    return (
        <div className="marketplace-container">
            <div className="cabecalho-marketplace">
                <h1>🏪 Marketplace Escolar</h1>
                <p>O teu portal de equipamento, fardas e material escolar.</p>
            </div>

            <div className="painel-filtros">
                <div className="pesquisa-principal">
                    <input 
                        type="text" 
                        placeholder="🔍 O que procuras? (Ex: T-Shirt, Caderno...)" 
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
                    />
                </div>
                <div className="filtros-secundarios">
                    <select value={filtroTamanho} onChange={(e) => setFiltroTamanho(e.target.value)}>
                        <option value="">Qualquer Tamanho</option>
                        {tamanhosDisponiveis.map(t => <option key={t as string} value={t as string}>{t}</option>)}
                    </select>
                    
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="">Qualquer Estado</option>
                        {estadosDisponiveis.map(e => <option key={e as string} value={e as string}>{e}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>A organizar as prateleiras...</p>
            ) : (
                <div className="grelha-produtos">
                    {anunciosFiltrados.length === 0 ? (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', fontSize: '1.2rem' }}>
                            Ups! Não encontrámos nada com esse nome. 🕵️‍♂️
                        </p>
                    ) : (
                        anunciosFiltrados.map((lote) => (
                            <CartaoMarketplace 
                                key={lote.ID_Stock} 
                                lote={lote} 
                                isFavorito={favoritos.includes(lote.ID_Stock)} 
                                onToggleFavorito={toggleFavorito} 
                                onInteresse={handleInteresse}
                                onAlugar={abrirModalAluguer} // Passamos o Gatilho do Modal
                            />
                        ))
                    )}
                </div>
            )}

            {/* ========================================== */}
            {/* O MODAL DE ALUGUER (A Janela Flutuante)    */}
            {/* ========================================== */}
            {modalAluguer.aberto && modalAluguer.lote && (
                <>
                    <div className="modal-overlay" onClick={fecharModalAluguer}></div>
                    <div className="modal-aluguer">
                        <div className="modal-cabecalho">
                            <h2>📅 Pedido de Aluguer</h2>
                            <button className="btn-fechar" onClick={fecharModalAluguer}>&times;</button>
                        </div>
                        
                        <div className="modal-corpo">
                            <div className="info-peca">
                                {modalAluguer.lote.Artigo.Foto ? (
                                    <img src={modalAluguer.lote.Artigo.Foto} alt="Artigo" />
                                ) : (
                                    <div className="placeholder-mini">📦</div>
                                )}
                                <div>
                                    <strong>{modalAluguer.lote.Artigo.Nome}</strong>
                                    <p>Tamanho: {modalAluguer.lote.Tamanho?.Descricao || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="alerta-responsabilidade">
                                ℹ️ Ao alugares esta peça, assumes a responsabilidade de a devolver no mesmo estado de conservação.
                            </div>

                            <div className="form-grupo">
                                <label>Data de Devolução Prevista</label>
                                <input 
                                    type="date" 
                                    min={obterDataMinima()} // Bloqueia dias anteriores a hoje
                                    value={dataDevolucao}
                                    onChange={(e) => setDataDevolucao(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="modal-rodape">
                            <button className="btn-cancelar" onClick={fecharModalAluguer}>Cancelar</button>
                            <button className="btn-confirmar" onClick={confirmarAluguer}>Confirmar Pedido</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ==========================================
// COMPONENTE AUXILIAR: O CARTÃO 
// ==========================================
function CartaoMarketplace({ lote, isFavorito, onToggleFavorito, onInteresse, onAlugar }: any) {
    // 1. Lemos os stocks (Garantimos que não dá erro se for null)
    const qtdVenda = lote.Quantidade_Venda || 0;
    const qtdAluguer = lote.Quantidade_Aluguer || 0;

    // 2. A Lógica de Negócio: O que é que o cartão diz?
    let textoDisponibilidade = "";
    if (qtdVenda > 0 && qtdAluguer > 0) {
        textoDisponibilidade = "Disponível para Venda e Aluguer";
    } else if (qtdVenda > 0) {
        textoDisponibilidade = `${qtdVenda} ${qtdVenda === 1 ? 'unidade para venda' : 'unidades para venda'}`;
    } else if (qtdAluguer > 0) {
        textoDisponibilidade = `${qtdAluguer} ${qtdAluguer === 1 ? 'unidade para aluguer' : 'unidades para aluguer'}`;
    } else {
        textoDisponibilidade = "Esgotado"; // Em teoria nunca chega aqui por causa do filtro no Backend, mas um Sénior previne sempre!
    }

    return (
        <div className="cartao-produto">
            <button 
                className={`btn-favorito ${isFavorito ? 'ativo' : 'inativo'}`}
                onClick={() => onToggleFavorito(lote.ID_Stock)}
                title={isFavorito ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            >
                {isFavorito ? '❤️' : '🤍'}
            </button>

            {lote.Artigo.Foto ? (
                <img src={lote.Artigo.Foto} alt={lote.Artigo.Nome} className="imagem-produto" />
            ) : (
                <div className="imagem-placeholder">📦</div>
            )}

            <div className="detalhes-produto">
                <div className="etiquetas">
                    {lote.Estado?.Descricao && <span>{lote.Estado.Descricao}</span>}
                    {lote.Tamanho?.Descricao && <span>{lote.Tamanho.Descricao}</span>}
                    {/* A etiqueta azul de Aluguer só aparece se a Coordenação permitir alugueres desta peça */}
                    {qtdAluguer > 0 && <span className="etiqueta-aluguer">Disponível p/ Aluguer</span>}
                </div>
                
                <div className="titulo">{lote.Artigo.Nome}</div>
                
                {/* O nosso texto dinâmico que se adapta ao que a escola quer! */}
                <div className="disponibilidade">
                    ⚡ {textoDisponibilidade}
                </div>
                
                <div className="acoes-cartao">
                    {/* O botão "Comprar" só aparece se houver stock de Venda */}
                    {qtdVenda > 0 && (
                        <button className="btn-interesse" onClick={() => onInteresse(lote.Artigo.Nome, lote.ID_Stock)}>
                            Comprar
                        </button>
                    )}
                    
                    {/* O botão "Alugar" só aparece se houver stock de Aluguer */}
                    {qtdAluguer > 0 && (
                        <button className="btn-alugar" onClick={() => onAlugar(lote)}>
                            📅 Pedir Emprestado
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
} 