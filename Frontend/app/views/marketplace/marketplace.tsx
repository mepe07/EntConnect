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
type VistaLista = Exclude<Vista, 'detalhe'>;
type AcaoModeracao = 'remover' | 'reativar' | 'arquivar';

const ESTADO_LABEL: Record<string, string> = {
    [EstadoAnuncio.ATIVO]: 'Ativo',
    [EstadoAnuncio.RESERVADO]: 'Reservado',
    [EstadoAnuncio.CONCLUIDO]: 'Concluído',
    [EstadoAnuncio.ARQUIVADO]: 'Arquivado',
    [EstadoAnuncio.REMOVIDO]: 'Removido',
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
    if (anuncio.Origem_Registo === OrigemRegisto.INVENTARIO_ESCOLA) {
        return 'Escola 50+10';
    }

    const relacaoCriador = anuncio.Utilizador_Criador ?? anuncio.Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador;
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

/**
 * Vista principal do Marketplace com montra, detalhe, gestão própria e moderação.
 */
export function Marketplace() {
    const utilizador = authService.getUserInfo() as User;
    const isCoordenadora = utilizador?.role === 'Coordenador';

    const [vista, setVista] = useState<Vista>('montra');
    const [vistaAnterior, setVistaAnterior] = useState<VistaLista>('montra');
    const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
    const [anuncioSelecionado, setAnuncioSelecionado] = useState<Anuncio | null>(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [pesquisa, setPesquisa] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroOrigem, setFiltroOrigem] = useState('todas');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [mensagemFluxo, setMensagemFluxo] = useState('Nenhuma ação executada ainda.');

    const [mostrarModalCriar, setMostrarModalCriar] = useState(false);
    const [mostrarModalModeracao, setMostrarModalModeracao] = useState(false);
    const [motivoModeracao, setMotivoModeracao] = useState('');
    const [acaoModeracaoPendente, setAcaoModeracaoPendente] = useState<AcaoModeracao>('remover');

    const selecionarPrimeiroAnuncio = (dados: Anuncio[]) => {
        setAnuncioSelecionado((atual) => {
            if (!dados.length) return null;
            if (!atual) return dados[0];
            return dados.find((item) => item.ID_Artigo === atual.ID_Artigo) ?? dados[0];
        });
    };

    const carregarMontra = async () => {
        setLoading(true);
        setErro('');
        try {
            const dados = await marketplaceService.listarAnuncios({
                publicado: true,
                estado: EstadoAnuncio.ATIVO,
            });
            setAnuncios(dados);
            selecionarPrimeiroAnuncio(dados);
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
            selecionarPrimeiroAnuncio(dados);
        } catch (error: any) {
            setErro(error.message || 'Erro ao carregar os teus anúncios.');
        } finally {
            setLoading(false);
        }
    };

    const carregarModeracao = async () => {
        setLoading(true);
        setErro('');
        try {
            const dados = await marketplaceService.listarAnunciosModeracao();
            setAnuncios(dados);
            selecionarPrimeiroAnuncio(dados);
        } catch (error: any) {
            setErro(error.message || 'Erro ao carregar a fila de moderação.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vista === 'montra') {
            carregarMontra();
            return;
        }

        if (vista === 'moderacao') {
            carregarModeracao();
            return;
        }

        if (vista === 'meus') {
            carregarMeusAnuncios();
        }
    }, [vista]);

    const anunciosFiltrados = useMemo(() => {
        return anuncios.filter((anuncio) => {
            const texto = [anuncio.Nome, anuncio.Descricao, getNomeCriador(anuncio), getCor(anuncio), getTamanho(anuncio)]
                .join(' ')
                .toLowerCase();
            const okPesquisa = texto.includes(pesquisa.toLowerCase());
            const okEstado = filtroEstado === 'todos' || anuncio.Estado_Anuncio === filtroEstado;
            const okOrigem = filtroOrigem === 'todas' || anuncio.Origem_Registo === filtroOrigem;
            const okTipo = filtroTipo === 'todos' || anuncio.Tipo_Anuncio === filtroTipo;
            return okPesquisa && okEstado && okOrigem && okTipo;
        });
    }, [anuncios, pesquisa, filtroEstado, filtroOrigem, filtroTipo]);

    const meusAnuncios = anunciosFiltrados;
    const anunciosModeracao = anunciosFiltrados;

    const isDono = (anuncio?: Anuncio | null) => {
        if (!anuncio || !utilizador) return false;
        return anuncio.ID_Utilizador_Criador === utilizador.sub;
    };

    const abrirVista = (novaVista: VistaLista) => {
        setVistaAnterior(novaVista);
        setVista(novaVista);
    };

    const abrirDetalhe = (anuncio: Anuncio) => {
        if (vista !== 'detalhe') {
            setVistaAnterior(vista as VistaLista);
        }
        setAnuncioSelecionado(anuncio);
        setVista('detalhe');
    };

    const recarregarVistaAtual = async () => {
        if (vistaAnterior === 'meus') {
            await carregarMeusAnuncios();
            return;
        }

        if (vistaAnterior === 'moderacao') {
            await carregarModeracao();
            return;
        }

        await carregarMontra();
    };

    const executarCriacaoAnuncio = async (payload: CriarAnuncioPayload) => {
        try {
            await marketplaceService.criarAnuncio(payload);
            setMostrarModalCriar(false);

            if (vista === 'montra') await carregarMontra();
            if (vista === 'meus') await carregarMeusAnuncios();

            setMensagemFluxo(`O teu anúncio '${payload.titulo}' foi publicado!`);
        } catch (err: any) {
            alert(err.message || 'Não foi possível criar o anúncio.');
            throw err;
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
            await recarregarVistaAtual();
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível alterar o estado.');
        }
    };

    const abrirModalModeracao = (anuncio: Anuncio, acao: AcaoModeracao) => {
        setAnuncioSelecionado(anuncio);
        setAcaoModeracaoPendente(acao);
        setMotivoModeracao('');

        if (acao === 'remover') {
            setMostrarModalModeracao(true);
            return;
        }

        executarAcaoModeracao(acao, anuncio);
    };

    const executarAcaoModeracao = async (acao: AcaoModeracao, anuncioAlvo?: Anuncio) => {
        const alvo = anuncioAlvo ?? anuncioSelecionado;
        if (!alvo) return;

        try {
            const atualizado = await marketplaceService.moderarAnuncio(alvo.ID_Artigo, acao, motivoModeracao || undefined);
            setAnuncioSelecionado(atualizado);

            if (acao === 'remover') {
                setMensagemFluxo(`Removeste '${atualizado.Nome}' por moderação.`);
            } else if (acao === 'reativar') {
                setMensagemFluxo(`Reativaste '${atualizado.Nome}' e voltou à montra.`);
            } else {
                setMensagemFluxo(`Arquivaste '${atualizado.Nome}'.`);
            }

            setMostrarModalModeracao(false);
            setMotivoModeracao('');
            await recarregarVistaAtual();
        } catch (error: any) {
            window.alert(error.message || 'Não foi possível aplicar a moderação.');
        }
    };

    const podeRegistarInteresse = Boolean(
        anuncioSelecionado &&
        !isDono(anuncioSelecionado) &&
        anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO,
    );

    const podeRemoverPorModeracao = Boolean(
        isCoordenadora &&
        anuncioSelecionado &&
        anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.REMOVIDO &&
        anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.ARQUIVADO,
    );

    const podeReativarPorModeracao = Boolean(
        isCoordenadora &&
        anuncioSelecionado?.Estado_Anuncio === EstadoAnuncio.REMOVIDO,
    );

    const podeArquivarPorModeracao = Boolean(
        isCoordenadora &&
        anuncioSelecionado &&
        anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.ARQUIVADO,
    );

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
                <div className="resumo-box"><span>Na montra</span><strong>{anuncios.filter((a) => a.Estado_Anuncio === EstadoAnuncio.ATIVO).length}</strong></div>
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
                            <button className={vista === 'montra' ? 'ativo' : ''} onClick={() => abrirVista('montra')}>Montra</button>
                            <button className={vista === 'detalhe' ? 'ativo' : ''} onClick={() => setVista('detalhe')}>Detalhe</button>
                            <button className={vista === 'meus' ? 'ativo' : ''} onClick={() => abrirVista('meus')}>Meus anúncios</button>
                            {isCoordenadora ? <button className={vista === 'moderacao' ? 'ativo' : ''} onClick={() => abrirVista('moderacao')}>Moderação</button> : null}
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
                            <option value={EstadoAnuncio.REMOVIDO}>Removido</option>
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
                                        <div>
                                            <div className="linha-topo">
                                                <span className={`badge-estado estado-${anuncio.Estado_Anuncio}`}>{ESTADO_LABEL[anuncio.Estado_Anuncio]}</span>
                                                <span className="badge-outline">{ORIGEM_LABEL[anuncio.Origem_Registo]}</span>
                                            </div>
                                            <h3>{anuncio.Nome}</h3>
                                            <p>{anuncio.Descricao || 'Sem descrição disponível.'}</p>
                                            <small>{getCor(anuncio)} · {getTamanho(anuncio)} · {getEstadoPeca(anuncio)} · {getQuantidade(anuncio)} un.</small>
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
                            <button className="btn-link" onClick={() => setVista(vistaAnterior)}>← Voltar</button>
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
                                    {anuncioSelecionado.Motivo_Moderacao ? (
                                        <div className="bloco-nota-moderacao">
                                            <span>Motivo de moderação</span>
                                            <strong>{anuncioSelecionado.Motivo_Moderacao}</strong>
                                        </div>
                                    ) : null}
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
                                            {podeRegistarInteresse ? <button className="btn-principal" onClick={registarInteresse}>Tenho interesse</button> : null}

                                            {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO ? (
                                                <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.RESERVADO)}>Marcar como reservado</button>
                                            ) : null}
                                            {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.RESERVADO ? (
                                                <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.ATIVO)}>Reativar anúncio</button>
                                            ) : null}
                                            {isDono(anuncioSelecionado) && (anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO || anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.RESERVADO) ? (
                                                <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.CONCLUIDO)}>Marcar como concluído</button>
                                            ) : null}
                                            {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.ARQUIVADO && anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.REMOVIDO ? (
                                                <button className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.ARQUIVADO)}>Arquivar anúncio</button>
                                            ) : null}

                                            {podeRemoverPorModeracao ? (
                                                <button className="btn-perigo" onClick={() => abrirModalModeracao(anuncioSelecionado, 'remover')}>Remover por moderação</button>
                                            ) : null}
                                            {podeReativarPorModeracao ? (
                                                <button className="btn-secundario" onClick={() => abrirModalModeracao(anuncioSelecionado, 'reativar')}>Reativar anúncio</button>
                                            ) : null}
                                            {podeArquivarPorModeracao ? (
                                                <button className="btn-secundario" onClick={() => abrirModalModeracao(anuncioSelecionado, 'arquivar')}>Arquivar por moderação</button>
                                            ) : null}
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
                                        {anuncio.Estado_Anuncio === EstadoAnuncio.REMOVIDO ? (
                                            <>
                                                <button className="btn-secundario" onClick={() => abrirModalModeracao(anuncio, 'reativar')}>Reativar</button>
                                                <button className="btn-secundario" onClick={() => abrirModalModeracao(anuncio, 'arquivar')}>Arquivar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn-perigo" onClick={() => abrirModalModeracao(anuncio, 'remover')}>Remover</button>
                                                <button className="btn-secundario" onClick={() => abrirModalModeracao(anuncio, 'arquivar')}>Arquivar</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                            <button className="btn-perigo" onClick={() => executarAcaoModeracao(acaoModeracaoPendente)}>Confirmar remoção</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
