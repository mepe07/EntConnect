// Ficheiro: src/views/Inventario/Inventario.tsx

import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import type { Artigo } from '../../models/interfaces/artigo.interface';
import { ModalPublicar } from './partials/ModalPublicar'; // 👈 O nosso novo componente isolado!
import './inventario.scss';

export function Inventario() {
    const [artigos, setArtigos] = useState<Artigo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGavetaAberta, setIsGavetaAberta] = useState(false);
    
    const [termoPesquisa, setTermoPesquisa] = useState('');
    
    // O estado do formulário de NOVO ARTIGO
    const [formData, setFormData] = useState({
        Nome: '', Notas: '', 
        Quantidade_Total: 1, Quantidade_Venda: 0, Quantidade_Aluguer: 0,
        ID_Cor: '', ID_Estado: '', ID_Tamanho: ''
    });

    // Estados para a Fotografia
    const [fotoFicheiro, setFotoFicheiro] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);

    // Estado para controlar a janela flutuante (Modal) de atualização da montra
    const [loteAtivoParaPublicar, setLoteAtivoParaPublicar] = useState<any>(null);

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

    // ==========================================
    // LÓGICA DE ATUALIZAÇÃO DA MONTRA (MODAL)
    // ==========================================
    const abrirModalPublicar = (lote: any, nomeArtigo: string) => {
        setLoteAtivoParaPublicar({
            idStock: lote.ID_Stock,
            nome: nomeArtigo,
            maximoTotal: lote.Quantidade_Total,
            atualVenda: lote.Quantidade_Venda,
            atualAluguer: lote.Quantidade_Aluguer
        });
    };

    const confirmarPublicacao = async (qtdVenda: number, qtdAluguer: number) => {
        if (!loteAtivoParaPublicar) return;

        try {
            await marketplaceService.publicarAnuncio(loteAtivoParaPublicar.idStock, qtdVenda, qtdAluguer);
            alert('Sucesso! A montra foi atualizada.');
            setLoteAtivoParaPublicar(null); // Fecha a janela
            carregarArmazem(); // Recarrega os dados fresquinhos do backend
        } catch (error: any) {
            alert('Erro ao publicar: ' + error.message);
        }
    };

    // ==========================================
    // LÓGICA DE CRIAÇÃO DE NOVO ARTIGO (GAVETA)
    // ==========================================
    const handleSubmeterFormulario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dadosCaixa = new FormData();

            dadosCaixa.append('Nome', formData.Nome);
            if (formData.Notas) dadosCaixa.append('Notas', formData.Notas);
            dadosCaixa.append('Quantidade_Total', formData.Quantidade_Total.toString());
            dadosCaixa.append('Quantidade_Venda', formData.Quantidade_Venda.toString());
            dadosCaixa.append('Quantidade_Aluguer', formData.Quantidade_Aluguer.toString());

            if (formData.ID_Cor) dadosCaixa.append('ID_Cor', formData.ID_Cor);
            if (formData.ID_Estado) dadosCaixa.append('ID_Estado', formData.ID_Estado);
            if (formData.ID_Tamanho) dadosCaixa.append('ID_Tamanho', formData.ID_Tamanho);

            if (fotoFicheiro) {
                dadosCaixa.append('foto', fotoFicheiro);
            }

            await marketplaceService.criarArtigo(dadosCaixa);
            alert('Artigo adicionado ao catálogo com sucesso!');
            
            fecharELimparGaveta();
            carregarArmazem(); 
        } catch (error: any) {
            alert(error.message);
        }
    };

    const fecharELimparGaveta = () => {
        setIsGavetaAberta(false);
        setFormData({ 
            Nome: '', Notas: '', 
            Quantidade_Total: 1, Quantidade_Venda: 0, Quantidade_Aluguer: 0,
            ID_Cor: '', ID_Estado: '', ID_Tamanho: '' 
        });
        setFotoFicheiro(null);
        setFotoPreview(null);
    };

    // ==========================================
    // FILTRAGEM DE PESQUISA
    // ==========================================
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

            <div className="barra-pesquisa">
                <input 
                    type="text" 
                    placeholder="🔍 Pesquisar por nome ou notas..." 
                    value={termoPesquisa}
                    onChange={(e) => setTermoPesquisa(e.target.value)}
                />
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>A organizar as caixas...</p>
            ) : (
                <div className="grelha-artigos">
                    {artigosFiltrados.length === 0 ? (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>
                            Nenhum artigo encontrado com essa pesquisa.
                        </p>
                    ) : (
                        artigosFiltrados.map(artigo => (
                            <div key={artigo.ID_Artigo} className="cartao-artigo">
                                {artigo.Foto ? (
                                    <img src={artigo.Foto} alt={artigo.Nome} className="imagem-artigo" />
                                ) : (
                                    <div className="imagem-placeholder">📦</div>
                                )}

                                <div className="corpo-artigo">
                                    <div className="titulo-artigo">{artigo.Nome}</div>
                                    {artigo.Notas && <p className="notas-artigo">{artigo.Notas}</p>}
                                    
                                    {(!artigo.Stock_Armazem || artigo.Stock_Armazem.length === 0) ? (
                                        <p style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.9rem' }}>Sem stock físico.</p>
                                    ) : (
                                        artigo.Stock_Armazem.map(lote => (
                                            <div key={lote.ID_Stock} className="lote-stock">
                                                <div className="lote-detalhes">
                                                    <span>Prateleira #{lote.ID_Stock}</span>
                                                    <span className="especificacoes">
                                                        {lote.Cor?.Descricao ? `${lote.Cor.Descricao} ` : ''} 
                                                        {lote.Estado?.Descricao ? `| ${lote.Estado.Descricao} ` : ''}
                                                        {lote.Tamanho?.Descricao ? `| [${lote.Tamanho.Descricao}]` : ''}
                                                    </span>
                                                </div>
                                                <div className="lote-badges">
                                                    <span className="badge-qtd">Físico: {lote.Quantidade_Total}</span>
                                                    {lote.Quantidade_Venda > 0 && <span className="badge-venda">Venda: {lote.Quantidade_Venda}</span>}
                                                    {lote.Quantidade_Aluguer > 0 && <span className="badge-aluguer">Aluguer: {lote.Quantidade_Aluguer}</span>}
                                                </div>
                                                <button 
                                                    className="btn-magico"
                                                    onClick={() => abrirModalPublicar(lote, artigo.Nome)}
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

            {/* ========================================== */}
            {/* O NOSSO NOVO COMPONENTE DE MODAL (ISOLADO) */}
            {/* ========================================== */}
            <ModalPublicar 
                isOpen={!!loteAtivoParaPublicar}
                onClose={() => setLoteAtivoParaPublicar(null)}
                onConfirm={confirmarPublicacao}
                loteInfo={loteAtivoParaPublicar}
            />

            {/* ========================================== */}
            {/* A GAVETA DE NOVO ARTIGO */}
            {/* ========================================== */}
            {isGavetaAberta && (
                <>
                    <div className="gaveta-overlay" onClick={fecharELimparGaveta}></div>
                    <div className="gaveta-conteudo">
                        <h2>Adicionar ao Armazém</h2>
                        <form onSubmit={handleSubmeterFormulario}>
                            
                            <h4 className="seccao-titulo">1. O Catálogo</h4>
                            
                            <div className="form-grupo">
                                <label>Nome do Artigo</label>
                                <input required type="text" placeholder="Ex: Cadeira Ergonómica" 
                                    value={formData.Nome} onChange={e => setFormData({ ...formData, Nome: e.target.value })} />
                            </div>

                            <div className="form-grupo">
                                <label>Fotografia (Do teu Computador/Telemóvel)</label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="input-ficheiro"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const ficheiro = e.target.files[0];
                                            setFotoFicheiro(ficheiro);
                                            setFotoPreview(URL.createObjectURL(ficheiro)); 
                                        }
                                    }} 
                                />
                                {fotoPreview && (
                                    <div className="preview-container">
                                        <img src={fotoPreview} alt="Preview do Upload" />
                                        <button type="button" className="btn-remover-foto" onClick={() => {
                                            setFotoFicheiro(null);
                                            setFotoPreview(null);
                                        }}>Remover Foto</button>
                                    </div>
                                )}
                            </div>

                            <div className="form-grupo">
                                <label>Notas (Opcional)</label>
                                <textarea rows={2} placeholder="Ex: Material da sala B" 
                                    value={formData.Notas} onChange={e => setFormData({ ...formData, Notas: e.target.value })} />
                            </div>

                            <h4 className="seccao-titulo">2. Primeiro Lote de Stock</h4>
                            <div className="form-grupo">
                                <label>Stock Físico Real (Total na Prateleira)</label>
                                <input required type="number" min="1" 
                                    value={formData.Quantidade_Total} onChange={e => setFormData({ ...formData, Quantidade_Total: parseInt(e.target.value) || 0 })} />
                            </div>
                            
                            <div className="linha-dupla">
                                <div className="form-grupo">
                                    <label>Qtd. Venda</label>
                                    <input required type="number" min="0" 
                                        value={formData.Quantidade_Venda} onChange={e => setFormData({ ...formData, Quantidade_Venda: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-grupo">
                                    <label>Qtd. Aluguer</label>
                                    <input required type="number" min="0" 
                                        value={formData.Quantidade_Aluguer} onChange={e => setFormData({ ...formData, Quantidade_Aluguer: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <h4 className="seccao-titulo">3. Especificações da Peça</h4>
                            <div className="linha-tripla">
                                <div className="form-grupo">
                                    <label>Estado</label>
                                    <select value={formData.ID_Estado} onChange={e => setFormData({ ...formData, ID_Estado: e.target.value })}>
                                        <option value="">(Não Especificar)</option>
                                        <option value="1">Novo</option>
                                        <option value="2">Como Novo</option>
                                        <option value="3">Usado - Bom</option>
                                        <option value="4">Com Marcas de Uso</option>
                                    </select>
                                </div>
                                <div className="form-grupo">
                                    <label>Tamanho</label>
                                    <select value={formData.ID_Tamanho} onChange={e => setFormData({ ...formData, ID_Tamanho: e.target.value })}>
                                        <option value="">(Não Especificar)</option>
                                        <option value="1">XS</option>
                                        <option value="2">S</option>
                                        <option value="3">M</option>
                                        <option value="4">L</option>
                                        <option value="5">XL</option>
                                    </select>
                                </div>
                                <div className="form-grupo">
                                    <label>Cor</label>
                                    <select value={formData.ID_Cor} onChange={e => setFormData({ ...formData, ID_Cor: e.target.value })}>
                                        <option value="">(Não Especificar)</option>
                                        <option value="1">Azul</option>
                                        <option value="2">Branco</option>
                                        <option value="3">Preto</option>
                                        <option value="4">Cinzento</option>
                                    </select>
                                </div>
                            </div>

                            <div className="gaveta-botoes">
                                <button type="button" className="btn-cancelar" onClick={fecharELimparGaveta}>Cancelar</button>
                                <button type="submit" className="btn-guardar">Salvar Registo</button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
} 