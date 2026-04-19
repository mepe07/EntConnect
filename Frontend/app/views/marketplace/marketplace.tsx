import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '../../services/auth.service';
import { marketplaceService } from '../../services/marketplace.service';
import type { User } from '../../models/interfaces/user.interface';
import {
    type Anuncio,
    type CriarAnuncioPayload,
    EstadoAnuncio,
    OrigemRegisto,
    TipoAnuncio,
    TipoInteresse,
} from '../../types/marketplace.types';
import { ModalCriarAnuncio } from './partials/modalCriarAnuncio';
import './marketplace.scss';

type Vista = 'montra' | 'detalhe' | 'meus' | 'moderacao';

const ESTADO_LABEL: Record<string, string> = {
    [EstadoAnuncio.ATIVO]: 'Ativo',
    [EstadoAnuncio.RESERVADO]: 'Reservado',
    [EstadoAnuncio.CONCLUIDO]: 'Concluído',
    [EstadoAnuncio.ARQUIVADO]: 'Arquivado',
    [EstadoAnuncio.REMOVIDO_PELO_DONO]: 'Removido pelo dono',
    [EstadoAnuncio.REMOVIDO_PELA_MODERACAO]: 'Removido pela moderação',
};

const ORIGEM_LABEL: Record<string, string> = {
    [OrigemRegisto.UTILIZADOR]: 'Utilizador',
    [OrigemRegisto.INVENTARIO_ESCOLA]: 'Inventário da escola',
};

const TIPO_LABEL: Record<string, string> = {
    [TipoAnuncio.VENDA]: 'Venda',
    [TipoAnuncio.ALUGUER]: 'Aluguer',
    [TipoAnuncio.AMBOS]: 'Ambos',
};

function getStockPrincipal(anuncio: Anuncio) {
    return anuncio.Stock_Armazem?.[0];
}

function getQuantidade(anuncio: Anuncio) {
    const stock = getStockPrincipal(anuncio);
    return stock?.Quantidade_Total ?? 0;
}

function getCor(anuncio: Anuncio) {
    const stock = getStockPrincipal(anuncio);
    return stock?.Cor?.Descricao ?? '--';
}

function getTamanho(anuncio: Anuncio) {
        return anuncio.Stock_Armazem?.[0]?.Tamanho?.Descricao || '--';
    }

    function getEstadoPeca(anuncio: Anuncio) {
        return anuncio.Stock_Armazem?.[0]?.Estado?.Descricao || '--';
    }

function getNomeCriador(anuncio: Anuncio) {
    // 1. Verificamos se é da escola
    if (anuncio.Origem_Registo === OrigemRegisto.INVENTARIO_ESCOLA) {
        return 'Escola 50+10';
    }

    const relacaoCriador = (anuncio as any).Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador;
    
    return relacaoCriador?.Pessoa?.Nome || 'Utilizador';
}

function formatarData(valor?: string) {
    if (!valor) return '--';
    try {
        return new Date(valor).toLocaleString('pt-PT');
    } catch {
        return valor;
    }
}

export function Marketplace() {
    const utilizador = authService.getUserInfo() as User;
    const isCoordenadora = utilizador?.role === 'Coordenador' || utilizador?.role === 'Admin';

    const [vista, setVista] = useState<Vista>('montra');
    const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
    const [anuncioSelecionado, setAnuncioSelecionado] = useState<Anuncio | null>(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [pesquisa, setPesquisa] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroOrigem, setFiltroOrigem] = useState('todas');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [mensagemFluxo, setMensagemFluxo] = useState('Nenhuma ação executada ainda.');
    
    // Controlo de Modais
    const [mostrarModalCriar, setMostrarModalCriar] = useState(false);
    const [mostrarModalModeracao, setMostrarModalModeracao] = useState(false);
    const [motivoModeracao, setMotivoModeracao] = useState('');

    const carregarMontra = async () => {
        setLoading(true);
        setErro('');
        try {
            const dados = await marketplaceService.listarAnuncios({ publicado: true });
            setAnuncios(dados);
            if (!anuncioSelecionado && dados.length > 0) {
                setAnuncioSelecionado(dados[0]);
            }
        } catch (error: any) {
            setErro(error.message || 'Erro ao carregar anúncios.');
        } finally {
            setLoading(false);
        }
    };

    const carregarMeusAnuncios = async () => {
        setLoading(true);
        setErro('');
        try {
            const dados = await marketplaceService.listarMeusAnuncios();
            setAnuncios(dados);
            if (dados.length > 0) setAnuncioSelecionado(dados[0]);
        } catch (error: any) {
            setErro(error.message || 'Erro ao carregar os teus anúncios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vista === 'montra' || vista === 'moderacao') {
            carregarMontra();
        }
        if (vista === 'meus') {
            carregarMeusAnuncios();
        }
    }, [vista]);

    const anunciosFiltrados = useMemo(() => {
        return anuncios.filter((anuncio) => {
            const texto = [anuncio.Nome, anuncio.Descricao, getNomeCriador(anuncio), getCor(anuncio), getTamanho(anuncio)].join(' ').toLowerCase();
            const okPesquisa = texto.includes(pesquisa.toLowerCase());
            const okEstado = filtroEstado === 'todos' || anuncio.Estado_Anuncio === filtroEstado;
            const okOrigem = filtroOrigem === 'todas' || anuncio.Origem_Registo === filtroOrigem;
            const okTipo = filtroTipo === 'todos' || anuncio.Tipo_Anuncio === filtroTipo;
            return okPesquisa && okEstado && okOrigem && okTipo;
        });
    }, [anuncios, pesquisa, filtroEstado, filtroOrigem, filtroTipo]);

    const meusAnuncios = anunciosFiltrados;
    const anunciosModeracao = anunciosFiltrados.filter((anuncio) => anuncio.Estado_Anuncio !== EstadoAnuncio.REMOVIDO_PELA_MODERACAO);

    const isDono = (anuncio?: Anuncio | null) => {
        if (!anuncio || !utilizador) return false;
        return anuncio.ID_Utilizador_Criador === utilizador.sub;
    };

    const abrirDetalhe = (anuncio: Anuncio) => {
        setAnuncioSelecionado(anuncio);
        setVista('detalhe');
    };

    // A Lógica Central de Criação de Anúncio
    const executarCriacaoAnuncio = async (payload: CriarAnuncioPayload) => {
        try {
            await marketplaceService.criarAnuncio(payload);
            setMostrarModalCriar(false); // Fecha o modal
            
            // Recarrega a vista correta para mostrar logo o anúncio
            if (vista === 'montra') await carregarMontra();
            if (vista === 'meus') await carregarMeusAnuncios();
            
            setMensagemFluxo(`O teu anúncio '${payload.titulo}' foi publicado!`);
        } catch (err: any) {
            alert(err.message || "Não foi possível criar o anúncio.");
            throw err; // Essencial para o botão do modal voltar ao normal
        }
    };

    const registarInteresse = async () => {
        if (!anuncioSelecionado) return;
        const mensagem = window.prompt('Queres deixar alguma mensagem ao anunciante?');
        if (mensagem === null) return;

        try {
            await marketplaceService.registarInteresse(anuncioSelecionado.ID_Artigo, {
                tipo: TipoInteresse.CONTACTO,
                mensagem,
            });
            setMensagemFluxo(`Registaste interesse em '${anuncioSelecionado.Nome}'.`);
            window.alert('Interesse registado com sucesso.');
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível registar o interesse.');
        }
    };

    const alterarEstado = async (estado: EstadoAnuncio) => {
        if (!anuncioSelecionado) return;
        try {
            const atualizado = await marketplaceService.alterarEstado(anuncioSelecionado.ID_Artigo, estado);
            setAnuncioSelecionado(atualizado);
            setMensagemFluxo(`Mudaste o estado de '${atualizado.Nome}' para '${ESTADO_LABEL[estado]}'.`);
            await carregarMontra();
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível alterar o estado.');
        }
    };

    const moderarAnuncio = async () => {
        if (!anuncioSelecionado) return;
        try {
            const atualizado = await marketplaceService.moderarAnuncio(anuncioSelecionado.ID_Artigo, 'remover', motivoModeracao || undefined);
            setAnuncioSelecionado(atualizado);
            setMensagemFluxo(`Removeste '${atualizado.Nome}' por moderação.`);
            setMostrarModalModeracao(false);
            setMotivoModeracao('');
            await carregarMontra();
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível moderar o anúncio.');
        }
    };

    return (
        <div className="marketplace-page">
            <div className="marketplace-topo">
                <div>
                    <span className="marketplace-pill">Marketplace comunitário</span>
                    <h1>Marketplace</h1>
                    <p>Montra interna de anúncios, sem preços públicos, com foco em detalhe, interesse e estados do anúncio.</p>
                </div>
                <div className="marketplace-topo-acoes">
                    <div className="perfil-indicador">Perfil: <strong>{isCoordenadora ? 'Coordenadora' : 'Utilizador'}</strong></div>
                    <button className="btn-principal" onClick={() => setMostrarModalCriar(true)}>Novo anúncio</button>
                </div>
            </div>

            <div className="marketplace-resumos">
                <div className="resumo-box"><span>Na montra</span><strong>{anuncios.filter((a) => a.Estado_Anuncio === EstadoAnuncio.ATIVO || a.Estado_Anuncio === EstadoAnuncio.RESERVADO).length}</strong></div>
                <div className="resumo-box"><span>Publicados pela escola</span><strong>{anuncios.filter((a) => a.Origem_Registo === OrigemRegisto.INVENTARIO_ESCOLA).length}</strong></div>
                <div className="resumo-box"><span>Os meus anúncios</span><strong>{meusAnuncios.length}</strong></div>
                <div className="resumo-box"><span>Fluxo</span><strong>{mensagemFluxo === 'Nenhuma ação executada ainda.' ? 'Pronto' : 'Atualizado'}</strong></div>
            </div>

            <div className="marketplace-layout">
                <div className="marketplace-main card-base">
                    <div className="marketplace-barra">
                        <div>
                            <h2>Área do Marketplace</h2>
                            <p>Mesmo tom visual do inventário: mais simples, direto e próximo da realidade da escola.</p>
                        </div>
                        <div className="tabs">
                            <button className={vista === 'montra' ? 'ativo' : ''} onClick={() => setVista('montra')}>Montra</button>
                            <button className={vista === 'detalhe' ? 'ativo' : ''} onClick={() => setVista('detalhe')}>Detalhe</button>
                            <button className={vista === 'meus' ? 'ativo' : ''} onClick={() => setVista('meus')}>Meus anúncios</button>
                            {isCoordenadora ? <button className={vista === 'moderacao' ? 'ativo' : ''} onClick={() => setVista('moderacao')}>Moderação</button> : null}
                        </div>
                    </div>

                    <div className="marketplace-filtros">
                        <input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar anúncio, categoria ou autor" />
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                            <option value="todos">Todos os estados</option>
                            <option value={EstadoAnuncio.ATIVO}>Ativo</option>
                            <option value={EstadoAnuncio.RESERVADO}>Reservado</option>
                            <option value={EstadoAnuncio.CONCLUIDO}>Concluído</option>
                            <option value={EstadoAnuncio.ARQUIVADO}>Arquivado</option>
                        </select>
                        <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}>
                            <option value="todas">Todas as origens</option>
                            <option value={OrigemRegisto.UTILIZADOR}>Utilizador</option>
                            <option value={OrigemRegisto.INVENTARIO_ESCOLA}>Inventário da escola</option>
                        </select>
                        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                            <option value="todos">Todos os tipos</option>
                            <option value={TipoAnuncio.VENDA}>Venda</option>
                            <option value={TipoAnuncio.ALUGUER}>Aluguer</option>
                            <option value={TipoAnuncio.AMBOS}>Ambos</option>
                        </select>
                    </div>

                    {erro ? <div className="mensagem-erro">{erro}</div> : null}
                    {loading ? <div className="estado-vazio">A carregar...</div> : null}

                    {!loading && vista === 'montra' && (
                        <div className="lista-anuncios">
                            {anunciosFiltrados.length === 0 ? <div className="estado-vazio">Não existem anúncios com estes filtros.</div> : anunciosFiltrados.map((anuncio) => (
                                <div key={anuncio.ID_Artigo} className="cartao-anuncio">
                                    <div className="cartao-corpo">
                                        <img src={anuncio.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={anuncio.Nome} />
                                        <div className="cartao-info">
                                            <div className="cartao-etiquetas">
                                                <span className={`badge-estado estado-${anuncio.Estado_Anuncio}`}>{ESTADO_LABEL[anuncio.Estado_Anuncio]}</span>
                                                <span className="badge-outline">{ORIGEM_LABEL[anuncio.Origem_Registo]}</span>
                                                <span className="badge-outline">{TIPO_LABEL[anuncio.Tipo_Anuncio]}</span>
                                            </div>
                                            <h3>{anuncio.Nome}</h3>
                                            <p>{anuncio.Descricao || 'Sem descrição.'}</p>
                                            <small>{getTamanho(anuncio)} · {getEstadoPeca(anuncio)} · {getQuantidade(anuncio)} un.</small>
                                        </div>
                                    </div>
                                    <div className="cartao-rodape">
                                        <span>Publicado por {getNomeCriador(anuncio)} · {formatarData(anuncio.Data_Atualizacao || anuncio.Data_Criacao)}</span>
                                        <button className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver detalhe</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && vista === 'detalhe' && anuncioSelecionado && (
                        <div className="detalhe-anuncio">
                            <button className="btn-link" onClick={() => setVista('montra')}>← Voltar à montra</button>
                            <div className="detalhe-grid">
                                <div className="detalhe-principal">
                                    <img className="detalhe-imagem" src={anuncioSelecionado.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={anuncioSelecionado.Nome} />
                                    <div className="detalhe-etiquetas">
                                        <span className={`badge-estado estado-${anuncioSelecionado.Estado_Anuncio}`}>{ESTADO_LABEL[anuncioSelecionado.Estado_Anuncio]}</span>
                                        <span className="badge-outline">{ORIGEM_LABEL[anuncioSelecionado.Origem_Registo]}</span>
                                        <span className="badge-outline">{TIPO_LABEL[anuncioSelecionado.Tipo_Anuncio]}</span>
                                    </div>
                                    <h2>{anuncioSelecionado.Nome}</h2>
                                    <p>{anuncioSelecionado.Descricao || 'Sem descrição.'}</p>
                                    <div className="detalhe-resumo">
                                        <div><span>Categoria</span><strong>{anuncioSelecionado.Notas || '--'}</strong></div>
                                        <div><span>Tamanho</span><strong>{getTamanho(anuncioSelecionado)}</strong></div>
                                        <div><span>Estado da peça</span><strong>{getEstadoPeca(anuncioSelecionado)}</strong></div>
                                        <div><span>Quantidade</span><strong>{getQuantidade(anuncioSelecionado)}</strong></div>
                                    </div>
                                </div>
                                <div className="detalhe-lateral">
                                    <div className="bloco-lateral">
                                        <h3>Contexto do anúncio</h3>
                                        <div className="linhas-info">
                                            <div><span>Publicado por</span><strong>{getNomeCriador(anuncioSelecionado)}</strong></div>
                                            <div><span>Origem</span><strong>{ORIGEM_LABEL[anuncioSelecionado.Origem_Registo]}</strong></div>
                                            <div><span>Publicado em</span><strong>{formatarData(anuncioSelecionado.Data_Criacao || anuncioSelecionado.Data_Atualizacao)}</strong></div>
                                        </div>
                                    </div>
                                    <div className="bloco-lateral">
                                        <h3>Ações</h3>
                                        <div className="acoes-lateral">
                                            {!isDono(anuncioSelecionado) ? <button className="btn-principal" onClick={registarInteresse}>Tenho interesse</button> : null}
                                            {isDono(anuncioSelecionado) ? <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.RESERVADO)}>Marcar como reservado</button> : null}
                                            {isDono(anuncioSelecionado) ? <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.CONCLUIDO)}>Marcar como concluído</button> : null}
                                            {isDono(anuncioSelecionado) ? <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.ARQUIVADO)}>Arquivar anúncio</button> : null}
                                            {isCoordenadora ? <button className="btn-perigo" onClick={() => setMostrarModalModeracao(true)}>Moderar anúncio</button> : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && vista === 'meus' && (
                        <div className="lista-simples">
                            {meusAnuncios.length === 0 ? <div className="estado-vazio">Ainda não tens anúncios.</div> : meusAnuncios.map((anuncio) => (
                                <div key={anuncio.ID_Artigo} className="linha-simples">
                                    <div>
                                        <div className="linha-topo">
                                            <span className={`badge-estado estado-${anuncio.Estado_Anuncio}`}>{ESTADO_LABEL[anuncio.Estado_Anuncio]}</span>
                                            <span className="badge-outline">{TIPO_LABEL[anuncio.Tipo_Anuncio]}</span>
                                        </div>
                                        <strong>{anuncio.Nome}</strong>
                                        <p>{getTamanho(anuncio)} · {getCor(anuncio)} · {getEstadoPeca(anuncio)}</p>
                                    </div>
                                    <div className="linha-acoes">
                                        <button className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && vista === 'moderacao' && isCoordenadora && (
                        <div className="lista-simples">
                            {anunciosModeracao.length === 0 ? <div className="estado-vazio">Não existem anúncios para moderar.</div> : anunciosModeracao.map((anuncio) => (
                                <div key={anuncio.ID_Artigo} className="linha-simples">
                                    <div>
                                        <div className="linha-topo">
                                            <span className={`badge-estado estado-${anuncio.Estado_Anuncio}`}>{ESTADO_LABEL[anuncio.Estado_Anuncio]}</span>
                                            <span className="badge-outline">{ORIGEM_LABEL[anuncio.Origem_Registo]}</span>
                                        </div>
                                        <strong>{anuncio.Nome}</strong>
                                        <p>{getNomeCriador(anuncio)}</p>
                                    </div>
                                    <div className="linha-acoes">
                                        <button className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver</button>
                                        <button className="btn-perigo" onClick={() => { setAnuncioSelecionado(anuncio); setMostrarModalModeracao(true); }}>Remover</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* A INJEÇÃO LIMPA DO NOVO MODAL */}
            <ModalCriarAnuncio 
                isOpen={mostrarModalCriar}
                onClose={() => setMostrarModalCriar(false)}
                onGuardar={executarCriacaoAnuncio}
            />

            {mostrarModalModeracao && anuncioSelecionado && (
                <div className="modal-overlay" onClick={() => setMostrarModalModeracao(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Remover anúncio por moderação</h3>
                        <p className="texto-ajuda">Anúncio: <strong>{anuncioSelecionado.Nome}</strong></p>
                        <textarea placeholder="Motivo da moderação" value={motivoModeracao} onChange={(e) => setMotivoModeracao(e.target.value)} />
                        <div className="modal-acoes">
                            <button className="btn-secundario" onClick={() => setMostrarModalModeracao(false)}>Cancelar</button>
                            <button className="btn-perigo" onClick={moderarAnuncio}>Confirmar remoção</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 