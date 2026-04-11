// Ficheiro: src/views/Inventario/Inventario.tsx

import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import type { Artigo, LoteStock } from '../../models/interfaces/artigo.interface'
import './inventario.scss';

export function Inventario() {
    const [artigos, setArtigos] = useState<Artigo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGavetaAberta, setIsGavetaAberta] = useState(false);
    
    // O estado da nossa nova barra de pesquisa
    const [termoPesquisa, setTermoPesquisa] = useState('');
    
    const [formData, setFormData] = useState({
        Nome: '', Notas: '', Foto: '', Quantidade_Total: 1, Quantidade_Venda: 0, Quantidade_Aluguer: 0
    });

    useEffect(() => {
        carregarArmazem();
    }, []);

    const carregarArmazem = async () => {
        try {
            setLoading(true);
            const dados = await marketplaceService.listarInventario();
            setArtigos(dados);
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePublicar = async (idStock: number, qtdMaxima: number, nomeArtigo: string) => {
        const resposta = window.prompt(
            `Quantas unidades físicas de "${nomeArtigo}" queres publicar na montra? (Físico existente: ${qtdMaxima})`
        );

        if (!resposta) return;

        const quantidade = parseInt(resposta, 10);

        if (isNaN(quantidade) || quantidade < 0 || quantidade > qtdMaxima) {
            alert('Quantidade inválida! Verifica o stock físico disponível.');
            return;
        }

        try {
            await marketplaceService.publicarAnuncio(idStock, quantidade);
            alert('Sucesso! A montra foi atualizada.');
            carregarArmazem();
        } catch (error: any) {
            alert('Erro ao publicar: ' + error.message);
        }
    };

    const handleSubmeterFormulario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await marketplaceService.criarArtigo(formData);
            alert('Artigo adicionado ao catálogo com sucesso!');
            setIsGavetaAberta(false);
            setFormData({ Nome: '', Notas: '', Foto: '', Quantidade_Total: 1, Quantidade_Venda: 0, Quantidade_Aluguer: 0 });
            carregarArmazem(); 
        } catch (error: any) {
            alert(error.message);
        }
    };

    // O nosso filtro inteligente: reage em tempo real enquanto o utilizador escreve!
    const artigosFiltrados = artigos.filter(artigo => {
        const termo = termoPesquisa.toLowerCase();
        const nomeMatch = artigo.Nome.toLowerCase().includes(termo);
        const notasMatch = artigo.Notas ? artigo.Notas.toLowerCase().includes(termo) : false;
        
        return nomeMatch || notasMatch;
    });

    return (
        <div className="inventario-moderno">
            <div className="cabecalho-armazem">
                <div>
                    <h1>📦 Armazém Central</h1>
                    <p>Gestão de catálogo e lotes físicos da escola.</p>
                </div>
                <button className="btn-adicionar" onClick={() => setIsGavetaAberta(true)}>
                    + Novo Artigo
                </button>
            </div>

            {/* A BARRA DE PESQUISA */}
            <div className="barra-pesquisa">
                <input 
                    type="text" 
                    placeholder="🔍 Pesquisar por nome ou notas..." 
                    value={termoPesquisa}
                    onChange={(e) => setTermoPesquisa(e.target.value)}
                />
            </div>

            {loading ? (
                <p>A organizar as caixas...</p>
            ) : (
                <div className="grelha-artigos">
                    {artigosFiltrados.length === 0 ? (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>
                            Nenhum artigo encontrado com essa pesquisa.
                        </p>
                    ) : (
                        artigosFiltrados.map(artigo => (
                            <div key={artigo.ID_Artigo} className="cartao-artigo">
                                
                                {/* A IMAGEM DO ARTIGO */}
                                {artigo.Foto ? (
                                    <img src={artigo.Foto} alt={artigo.Nome} className="imagem-artigo" />
                                ) : (
                                    <div className="imagem-placeholder">📦</div>
                                )}

                                {/* O CORPO DE TEXTO DO ARTIGO */}
                                <div className="corpo-artigo">
                                    {/* O Título do Artigo */}
                                    <div className="titulo-artigo">{artigo.Nome}</div>
                                    {artigo.Notas && <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{artigo.Notas}</p>}
                                    
                                    {/* O Loop das Prateleiras (Lotes Físicos) */}
                                    {(!artigo.Stock_Armazem || artigo.Stock_Armazem.length === 0) ? (
                                        <p style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.9rem' }}>Sem stock físico.</p>
                                    ) : (
                                        artigo.Stock_Armazem.map(lote => (
                                            <div key={lote.ID_Stock} className="lote-stock">
                                                <div className="lote-detalhes">
                                                    <span>Prateleira #{lote.ID_Stock}</span>
                                                    <span>
                                                        {lote.Cor?.Descricao ? `${lote.Cor.Descricao} ` : ''} 
                                                        {lote.Estado?.Descricao ? `| ${lote.Estado.Descricao}` : ''}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="badge-qtd">Físico: {lote.Quantidade_Total}</span>
                                                    {lote.Quantidade_Venda > 0 && (
                                                        <span className="badge-venda">Venda: {lote.Quantidade_Venda}</span>
                                                    )}
                                                </div>
                                                <button 
                                                    className="btn-magico"
                                                    onClick={() => handlePublicar(lote.ID_Stock, lote.Quantidade_Total, artigo.Nome)}
                                                >
                                                    🏪 Atualizar Montra
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {isGavetaAberta && (
                <>
                    <div className="gaveta-overlay" onClick={() => setIsGavetaAberta(false)}></div>
                    <div className="gaveta-conteudo">
                        <h2>Adicionar ao Armazém</h2>
                        <form onSubmit={handleSubmeterFormulario}>
                            
                            <h4 style={{ color: '#2563eb', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>1. O Catálogo</h4>
                            <div className="form-grupo">
                                <label>Nome do Artigo</label>
                                <input required type="text" placeholder="Ex: Cadeira Ergonómica" 
                                    value={formData.Nome} onChange={e => setFormData({ ...formData, Nome: e.target.value })} />
                            </div>

                            {/* NOVO CAMPO: FOTOGRAFIA */}
                            <div className="form-grupo">
                                <label>URL da Fotografia (Opcional)</label>
                                <input type="url" placeholder="Ex: https://site.com/foto.jpg" 
                                    value={formData.Foto} onChange={e => setFormData({ ...formData, Foto: e.target.value })} />
                                {formData.Foto && (
                                    <div style={{ marginTop: '0.5rem', borderRadius: '6px', overflow: 'hidden', height: '100px' }}>
                                        <img src={formData.Foto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-grupo">
                                <label>Notas (Opcional)</label>
                                <textarea rows={2} placeholder="Ex: Material da sala B" 
                                    value={formData.Notas} onChange={e => setFormData({ ...formData, Notas: e.target.value })} />
                            </div>

                            <h4 style={{ color: '#2563eb', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>2. Primeiro Lote de Stock</h4>
                            <div className="form-grupo">
                                <label>Stock Físico Real (Total na Prateleira)</label>
                                <input required type="number" min="1" 
                                    value={formData.Quantidade_Total} onChange={e => setFormData({ ...formData, Quantidade_Total: parseInt(e.target.value) })} />
                            </div>
                            <div className="form-grupo">
                                <label>Destas, quantas vão diretas para a Montra (Venda)?</label>
                                <input required type="number" min="0" max={formData.Quantidade_Total} 
                                    value={formData.Quantidade_Venda} onChange={e => setFormData({ ...formData, Quantidade_Venda: parseInt(e.target.value) })} />
                            </div>

                            <div className="gaveta-botoes">
                                <button type="submit" className="btn-guardar">Salvar</button>
                                <button type="button" className="btn-cancelar" onClick={() => setIsGavetaAberta(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
} 