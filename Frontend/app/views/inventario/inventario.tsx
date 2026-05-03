import React, { useEffect, useMemo, useState } from 'react';
import { marketplaceService } from '../../services/marketplace.service';
import {
    type Anuncio,
    type CriarItemInventarioPayload,
    EstadoAnuncio,
    OrigemRegisto,
    TipoAnuncio,
} from '../../types/marketplace.types';
import './inventario.scss';

// AS IMPORTAÇÕES ESTÃO CORRETAS AGORA
import { ModalCriarItem } from './partials/modalCriarItem';
import { ModalPublicar } from './partials/modalPublicar';

function getStockPrincipal(item: Anuncio) { return item.Stock_Armazem?.[0]; }
function getQuantidadeTotal(item: Anuncio) { return getStockPrincipal(item)?.Quantidade_Total ?? 0; }
function getQuantidadeVenda(item: Anuncio) { return getStockPrincipal(item)?.Quantidade_Venda ?? 0; }
function getQuantidadeAluguer(item: Anuncio) { return getStockPrincipal(item)?.Quantidade_Aluguer ?? 0; }
function getCor(item: Anuncio) { return getStockPrincipal(item)?.Cor?.Descricao ?? '--'; }
function getTamanho(item: Anuncio) { return getStockPrincipal(item)?.Tamanho?.Descricao ?? '--'; }
function getEstadoPeca(item: Anuncio) { return getStockPrincipal(item)?.Estado?.Descricao ?? '--'; }
function formatarData(valor?: string) {
    if (!valor) return '--';
    try { return new Date(valor).toLocaleString('pt-PT'); } catch { return valor; }
}

const ESTADO_LABEL: Record<string, string> = {
    [EstadoAnuncio.ATIVO]: 'Ativo', [EstadoAnuncio.RESERVADO]: 'Reservado',
    [EstadoAnuncio.CONCLUIDO]: 'Concluído', [EstadoAnuncio.ARQUIVADO]: 'Arquivado',
    [EstadoAnuncio.REMOVIDO]: 'Removido',
};

type Vista = 'lista' | 'detalhe' | 'publicados';

/**
 * Vista de inventário escolar com criação, detalhe e publicação de itens.
 */
export function Inventario() {
    const [vista, setVista] = useState<Vista>('lista');
    const [inventario, setInventario] = useState<Anuncio[]>([]);
    const [itemSelecionado, setItemSelecionado] = useState<Anuncio | null>(null);
    const [pesquisa, setPesquisa] = useState('');
    const [filtroPublicacao, setFiltroPublicacao] = useState('todos');
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [resumoFluxo, setResumoFluxo] = useState('Sem ações executadas ainda.');
    
    // Controlo de Modais
    const [mostrarModalPublicar, setMostrarModalPublicar] = useState(false);
    const [mostrarModalCriar, setMostrarModalCriar] = useState(false);
    
    const [formCriar, setFormCriar] = useState<CriarItemInventarioPayload>({
        titulo: '', descricao: '', quantidade: 0, foto: ''
    });

    const carregarInventario = async () => {
        setLoading(true); setErro('');
        try {
            const dados = await marketplaceService.listarInventarioDaEscola();
            setInventario(dados);
            if (!itemSelecionado && dados.length > 0) setItemSelecionado(dados[0]);
        } catch (error: any) {
            setErro(error.message || 'Erro ao carregar o inventário da escola.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { carregarInventario(); }, []);

    const inventarioFiltrado = useMemo(() => {
        return inventario.filter((item) => {
            const texto = [item.Nome, item.Descricao, getCor(item), getTamanho(item)].join(' ').toLowerCase();
            const okPesquisa = texto.includes(pesquisa.toLowerCase());
            const okPublicacao = filtroPublicacao === 'todos' || (filtroPublicacao === 'publicado' && item.Publicado_No_Marketplace) || (filtroPublicacao === 'nao_publicado' && !item.Publicado_No_Marketplace);
            return okPesquisa && okPublicacao;
        });
    }, [inventario, pesquisa, filtroPublicacao]);

    const publicados = inventarioFiltrado.filter((item) => item.Publicado_No_Marketplace);

    const abrirDetalhe = (item: Anuncio) => {
        setItemSelecionado(item);
        setVista('detalhe');
    };

    const adicionarNovoItem = async () => {
        if (!formCriar.titulo || formCriar.quantidade === 0) {
            alert('Preenche o título e uma quantidade.');
            return;
        }
        try {
            await marketplaceService.criarItemInventario(formCriar);
            setMostrarModalCriar(false);
            setFormCriar({ titulo: '', descricao: '', quantidade: 0, foto: '' });
            carregarInventario();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const confirmarPublicacao = async ({
        tipoAnuncio,
        quantidadeVenda,
        quantidadeAluguer,
        descricao,
    }: {
        tipoAnuncio: TipoAnuncio;
        quantidadeVenda: number;
        quantidadeAluguer: number;
        descricao: string;
    }) => {
        if (!itemSelecionado) return;
        try {
            await marketplaceService.publicarInventarioDaEscola({
                idArtigo: itemSelecionado.ID_Artigo,
                titulo: itemSelecionado.Nome,
                foto: itemSelecionado.Foto,
                tipoAnuncio,
                quantidadeVenda,
                quantidadeAluguer,
                descricao,
            });
            setResumoFluxo(`Publicaste '${itemSelecionado.Nome}' no Marketplace.`);
            setMostrarModalPublicar(false);
            setVista('publicados');
            await carregarInventario();
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível publicar no Marketplace.');
        }
    };

    return (
        <div className="inventario-page">
            <div className="inventario-topo">
                <div>
                    <span className="inventario-pill">Área privada da coordenadora</span>
                    <h1>Inventário da escola</h1>
                    <p>Gestão prática de lotes, quantidades e publicação para o Marketplace.</p>
                </div>
                <div className="inventario-acoes-topo">
                    <button className="btn-secundario" onClick={carregarInventario}>Atualizar</button>
                    <button className="btn-principal" onClick={() => setVista('publicados')}>Ver publicados</button>
                    <button className="btn-principal" onClick={() => setMostrarModalCriar(true)}>
                        <i className="fa-solid fa-plus"></i> Novo Item
                    </button>
                </div>
            </div>

            <div className="inventario-resumos">
                <div className="resumo-box"><span>Lotes</span><strong>{inventario.length}</strong></div>
                <div className="resumo-box"><span>Publicados</span><strong>{inventario.filter((item) => item.Publicado_No_Marketplace).length}</strong></div>
                <div className="resumo-box"><span>Origem</span><strong>Escola</strong></div>
                <div className="resumo-box"><span>Fluxo</span><strong>{resumoFluxo === 'Sem ações executadas ainda.' ? 'Pronto' : 'Atualizado'}</strong></div>
            </div>

            <div className="inventario-layout">
                <div className="inventario-main card-base">
                    <div className="inventario-barra">
                        <div>
                            <h2>Gestão do inventário</h2>
                            <p>Vista operacional da coordenadora com foco em detalhe, stock e publicação rápida.</p>
                        </div>
                        <div className="tabs">
                            <button className={vista === 'lista' ? 'ativo' : ''} onClick={() => setVista('lista')}>Lista</button>
                            <button className={vista === 'detalhe' ? 'ativo' : ''} onClick={() => setVista('detalhe')}>Detalhe</button>
                            <button className={vista === 'publicados' ? 'ativo' : ''} onClick={() => setVista('publicados')}>Publicados</button>
                        </div>
                    </div>

                    <div className="inventario-filtros">
                        <input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar lote, cor ou tamanho" />
                        <select value={filtroPublicacao} onChange={(e) => setFiltroPublicacao(e.target.value)}>
                            <option value="todos">Todos</option>
                            <option value="publicado">Publicado</option>
                            <option value="nao_publicado">Não publicado</option>
                        </select>
                    </div>

                    {erro ? <div className="mensagem-erro">{erro}</div> : null}
                    {loading ? <div className="estado-vazio">A carregar inventário...</div> : null}

                    {!loading && vista === 'lista' && (
                        <div className="lista-lotes">
                            {inventarioFiltrado.length === 0 ? <div className="estado-vazio">Não existem artigos para mostrar.</div> : inventarioFiltrado.map((item) => (
                                <div key={item.ID_Artigo} className="linha-lote">
                                    <div className="linha-lote-principal">
                                        <img src={item.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={item.Nome} />
                                        <div>
                                            <div className="linha-topo">
                                                <span className={`badge-estado estado-${item.Estado_Anuncio}`}>{ESTADO_LABEL[item.Estado_Anuncio] || item.Estado_Anuncio}</span>
                                                {item.Publicado_No_Marketplace ? <span className="badge-outline">Publicado na montra</span> : <span className="badge-outline">Só inventário</span>}
                                            </div>
                                            <strong>{item.Nome}</strong>
                                            <p>{getEstadoPeca(item)} · {getCor(item)} · Tamanho {getTamanho(item)} · Quantidade {getQuantidadeTotal(item)}</p>
                                            <small>Atualizado: {formatarData(item.Data_Atualizacao || item.Data_Criacao)}</small>
                                        </div>
                                    </div>
                                    <div className="linha-acoes">
                                        <button className="btn-secundario" onClick={() => abrirDetalhe(item)}>Ver detalhe</button>
                                        <button className="btn-principal" onClick={() => { setItemSelecionado(item); setMostrarModalPublicar(true); }}>Publicar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && vista === 'detalhe' && itemSelecionado && (
                        <div className="detalhe-lote">
                            <button className="btn-link" onClick={() => setVista('lista')}>← Voltar à lista</button>
                            <div className="detalhe-grid">
                                <div className="detalhe-principal">
                                    <img className="detalhe-imagem" src={itemSelecionado.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={itemSelecionado.Nome} />
                                    <div className="detalhe-etiquetas">
                                        <span className={`badge-estado estado-${itemSelecionado.Estado_Anuncio}`}>{ESTADO_LABEL[itemSelecionado.Estado_Anuncio] || itemSelecionado.Estado_Anuncio}</span>
                                        {itemSelecionado.Publicado_No_Marketplace ? <span className="badge-outline">Publicado no Marketplace</span> : <span className="badge-outline">Inventário interno</span>}
                                    </div>
                                    <h2>{itemSelecionado.Nome}</h2>
                                    <p>{itemSelecionado.Descricao || itemSelecionado.Notas || 'Sem notas adicionais neste lote.'}</p>

                                    <div className="detalhe-resumo">
                                        <div><span>Tamanho</span><strong>{getTamanho(itemSelecionado)}</strong></div>
                                        <div><span>Cor</span><strong>{getCor(itemSelecionado)}</strong></div>
                                        <div><span>Estado da peça</span><strong>{getEstadoPeca(itemSelecionado)}</strong></div>
                                        <div><span>Quantidade total</span><strong>{getQuantidadeTotal(itemSelecionado)}</strong></div>
                                    </div>
                                </div>

                                <div className="detalhe-lateral">
                                    <div className="bloco-lateral">
                                        <h3>Distribuição atual</h3>
                                        <div className="linhas-info">
                                            <div><span>Para venda</span><strong>{getQuantidadeVenda(itemSelecionado)}</strong></div>
                                            <div><span>Para aluguer</span><strong>{getQuantidadeAluguer(itemSelecionado)}</strong></div>
                                            <div><span>Atualizado</span><strong>{formatarData(itemSelecionado.Data_Atualizacao || itemSelecionado.Data_Criacao)}</strong></div>
                                        </div>
                                    </div>
                                    <div className="bloco-lateral">
                                        <h3>Ações do lote</h3>
                                        <div className="acoes-lateral">
                                            <button className="btn-principal" onClick={() => setMostrarModalPublicar(true)}>{itemSelecionado.Publicado_No_Marketplace ? 'Rever publicação' : 'Publicar no Marketplace'}</button>
                                            <button className="btn-secundario" onClick={() => setVista('publicados')}>Ver publicados</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && vista === 'publicados' && (
                        <div className="lista-lotes">
                            {publicados.length === 0 ? <div className="estado-vazio">Ainda não existem publicações ativas vindas do inventário.</div> : publicados.map((item) => (
                                <div key={item.ID_Artigo} className="linha-lote linha-publicada">
                                    <div className="linha-lote-principal">
                                        <img src={item.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={item.Nome} />
                                        <div>
                                            <div className="linha-topo">
                                                <span className={`badge-estado estado-${item.Estado_Anuncio}`}>{ESTADO_LABEL[item.Estado_Anuncio] || item.Estado_Anuncio}</span>
                                                <span className="badge-outline">Publicado na montra</span>
                                            </div>
                                            <strong>{item.Nome}</strong>
                                            <p>Venda: {getQuantidadeVenda(item)} · Aluguer: {getQuantidadeAluguer(item)} · Quantidade total: {getQuantidadeTotal(item)}</p>
                                        </div>
                                    </div>
                                    <div className="linha-acoes">
                                        <button className="btn-secundario" onClick={() => abrirDetalhe(item)}>Ver detalhe</button>
                                        <button className="btn-principal" onClick={() => { setItemSelecionado(item); setMostrarModalPublicar(true); }}>Rever publicação</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CHAMADAS CORRETAS DOS MODAIS ISOLADOS */}
            
            {mostrarModalCriar && (
                <ModalCriarItem
                    form={formCriar}
                    setForm={setFormCriar}
                    onClose={() => setMostrarModalCriar(false)}
                    onGuardar={adicionarNovoItem}
                />
            )}

            {mostrarModalPublicar && itemSelecionado && (
                <ModalPublicar
                    isOpen={mostrarModalPublicar}
                    onClose={() => setMostrarModalPublicar(false)}
                    onConfirm={confirmarPublicacao}
                    loteInfo={{
                        idStock: itemSelecionado.Stock_Armazem?.[0]?.ID_Stock || 0,
                        nome: itemSelecionado.Nome,
                        descricaoOriginal: itemSelecionado.Descricao || '',
                        maximoTotal: getQuantidadeTotal(itemSelecionado),
                        atualVenda: getQuantidadeVenda(itemSelecionado),
                        atualAluguer: getQuantidadeAluguer(itemSelecionado),
                    }}
                />
            )}

        </div>
    );
} 
