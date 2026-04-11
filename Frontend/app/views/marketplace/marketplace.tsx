// Ficheiro: src/views/Marketplace/Marketplace.tsx

import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import type { LoteMarketplace } from '../../models/interfaces/artigo.interface';
import './marketplace.scss';

export function Marketplace() {
    const [anuncios, setAnuncios] = useState<LoteMarketplace[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados da Pesquisa Avançada
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [filtroTamanho, setFiltroTamanho] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    // Estado dos Favoritos (Controla a cor do coração na interface em tempo real)
    const [favoritos, setFavoritos] = useState<number[]>([]);

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

    // FUNÇÃO MAGNÉTICA REAL: Alternar Favoritos na Base de Dados
    const toggleFavorito = async (idStock: number) => {
        try {
            // Vai ao SQL Server via NestJS
            const resposta = await marketplaceService.alternarFavorito(idStock);
            
            // Atualiza o ecrã instantaneamente para o utilizador não ficar à espera
            if (resposta.status === 'adicionado') {
                setFavoritos(prev => [...prev, idStock]);
            } else {
                setFavoritos(prev => prev.filter(id => id !== idStock));
            }
        } catch (error: any) {
            alert('Erro ao guardar favorito: ' + error.message);
        }
    };

    // A MÁQUINA DE NEGÓCIOS REAL: Registar Intenção de "Compra/Requisição"
    const handleInteresse = async (nomeArtigo: string, idStock: number) => {
        const confirmacao = window.confirm(`Queres mesmo enviar um pedido à Direção para o artigo: ${nomeArtigo}?`);
        
        if (!confirmacao) return;

        try {
            // Envia a intenção. A quantidade física no armazém NÃO é bloqueada aqui.
            await marketplaceService.registarInteresse(idStock, "Estou interessado neste artigo.");
            alert('✅ Pedido registado com sucesso! A Coordenação vai analisar.');
        } catch (error: any) {
            alert('❌ Erro: ' + error.message);
        }
    };

    // ==========================================
    // LÓGICA DE FILTRAGEM AVANÇADA
    // ==========================================
    const anunciosFiltrados = anuncios.filter(anuncio => {
        const matchTexto = anuncio.Artigo.Nome.toLowerCase().includes(termoPesquisa.toLowerCase());
        const matchTamanho = filtroTamanho ? anuncio.Tamanho?.Descricao === filtroTamanho : true;
        const matchEstado = filtroEstado ? anuncio.Estado?.Descricao === filtroEstado : true;
        
        return matchTexto && matchTamanho && matchEstado;
    });

    // Extrair opções únicas para os Dropdowns (Sem repetir valores)
    const tamanhosDisponiveis = Array.from(new Set(anuncios.map(a => a.Tamanho?.Descricao).filter(Boolean)));
    const estadosDisponiveis = Array.from(new Set(anuncios.map(a => a.Estado?.Descricao).filter(Boolean)));

    return (
        <div className="marketplace-container">
            <div className="cabecalho-marketplace">
                <h1>🏪 Marketplace Escolar</h1>
                <p>O teu portal de equipamento, fardas e material escolar.</p>
            </div>

            {/* PAINEL DE FILTROS AVANÇADOS */}
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
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ==========================================
// COMPONENTE AUXILIAR: O CARTÃO 
// ==========================================
function CartaoMarketplace({ lote, isFavorito, onToggleFavorito, onInteresse }: any) {
    return (
        <div className="cartao-produto">
            {/* O Botão de Favorito no topo direito da imagem */}
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
                </div>
                <div className="titulo">{lote.Artigo.Nome}</div>
                <div className="disponibilidade">
                    ⚡ {lote.Quantidade_Venda} {lote.Quantidade_Venda === 1 ? 'unidade disponível' : 'unidades disponíveis'}
                </div>
                <button className="btn-interesse" onClick={() => onInteresse(lote.Artigo.Nome, lote.ID_Stock)}>
                    Tenho Interesse
                </button>
            </div>
        </div>
    );
} 