import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '../../services/auth.service';
import { marketplaceService } from '../../services/marketplace.service';
import type { User } from '../../models/interfaces/user.interface';
import {
    type Anuncio,
    type CalendarioAnuncioItem,
    type CriarAnuncioPayload,
    type CriarPedidoAluguerPayload,
    type MeuAluguer,
    type RegistoModeracaoMarketplace,
    EstadoAnuncio,
    OrigemRegisto,
    TipoAnuncio,
} from '../../types/marketplace.types';
import { ModalCriarAnuncio } from './partials/modalCriarAnuncio';
import { AnuncioDisponibilidade } from './partials/anuncioDisponibilidade';
import { MeusAlugueres } from './partials/meusAlugueres';
import './marketplace.scss';

import { showToast } from '~/components/toast/toast';
type Vista = 'montra' | 'detalhe' | 'meus' | 'alugueres' | 'moderacao';
type VistaLista = Exclude<Vista, 'detalhe'>;
type AcaoModeracao = 'remover' | 'reativar' | 'arquivar';
type TabDetalhe = 'detalhe' | 'disponibilidade';

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
    ambos: 'Legado',
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

function getPessoaCriador(anuncio: Anuncio) {
    const relacaoCriador = anuncio.Utilizador_Criador ?? anuncio.Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador;
    return relacaoCriador?.Pessoa;
}

function getNomeCriador(anuncio: Anuncio) {
    if (anuncio.Origem_Registo === OrigemRegisto.INVENTARIO_ESCOLA) {
        return 'Escola 50+10';
    }

    return getPessoaCriador(anuncio)?.Nome || 'Utilizador';
}

function getTelefoneCriador(anuncio: Anuncio) {
    const pessoa = getPessoaCriador(anuncio);

    return (
        pessoa?.Contacto ??
        pessoa?.Contato ??
        pessoa?.Telefone ??
        pessoa?.Telemovel ??
        '--'
    );
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

    const [tabDetalhe, setTabDetalhe] = useState<TabDetalhe>('detalhe');
    const [calendarioAnuncio, setCalendarioAnuncio] = useState<CalendarioAnuncioItem[]>([]);
    const [calendarioLoading, setCalendarioLoading] = useState(false);
    const [calendarioErro, setCalendarioErro] = useState('');

    const [meusAlugueres, setMeusAlugueres] = useState<MeuAluguer[]>([]);
    const [meusAlugueresLoading, setMeusAlugueresLoading] = useState(false);
    const [meusAlugueresErro, setMeusAlugueresErro] = useState('');

    const [registosModeracao, setRegistosModeracao] = useState<RegistoModeracaoMarketplace[]>([]);

    const [mostrarModalCriar, setMostrarModalCriar] = useState(false);
    const [mostrarModalContacto, setMostrarModalContacto] = useState(false);
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

    const carregarMeusAlugueres = async () => {
        setMeusAlugueresLoading(true);
        setMeusAlugueresErro('');

        try {
            const dados = await marketplaceService.listarMeusAlugueres();
            setMeusAlugueres(dados);
        } catch (error: any) {
            setMeusAlugueresErro(error.message || 'Erro ao carregar os teus alugueres.');
        } finally {
            setMeusAlugueresLoading(false);
        }
    };

    const carregarModeracao = async () => {
        setLoading(true);
        setErro('');
        try {
            const [dados, registos] = await Promise.all([
                marketplaceService.listarAnunciosModeracao(),
                marketplaceService.listarRegistoModeracao(),
            ]);

            setAnuncios(dados);
            setRegistosModeracao(registos);
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
            return;
        }

        if (vista === 'alugueres') {
            carregarMeusAlugueres();
        }
    }, [vista]);

    useEffect(() => {
        if (
            vista === 'detalhe' &&
            tabDetalhe === 'disponibilidade' &&
            isAnuncioAluguer(anuncioSelecionado)
        ) {
            carregarCalendarioAnuncio(anuncioSelecionado?.ID_Artigo);
        }
    }, [vista, tabDetalhe, anuncioSelecionado?.ID_Artigo, anuncioSelecionado?.Tipo_Anuncio]);

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

    const ultimoRegistoModeracaoPorArtigo = useMemo(() => {
        const mapa = new Map<number, RegistoModeracaoMarketplace>();

        [...registosModeracao]
            .sort((a, b) => new Date(b.Data_Registo).getTime() - new Date(a.Data_Registo).getTime())
            .forEach((registo) => {
                if (!mapa.has(registo.ID_Artigo)) {
                    mapa.set(registo.ID_Artigo, registo);
                }
            });

        return mapa;
    }, [registosModeracao]);

    const isDono = (anuncio?: Anuncio | null) => {
        if (!anuncio || !utilizador) return false;
        return anuncio.ID_Utilizador_Criador === utilizador.sub;
    };

    const isAnuncioAluguer = (anuncio?: Anuncio | null) => anuncio?.Tipo_Anuncio === TipoAnuncio.ALUGUER;

    const carregarCalendarioAnuncio = async (idArtigo = anuncioSelecionado?.ID_Artigo) => {
        if (!idArtigo) return;

        setCalendarioLoading(true);
        setCalendarioErro('');

        try {
            const dados = await marketplaceService.obterCalendarioAnuncio(idArtigo);
            setCalendarioAnuncio(dados);
        } catch (error: any) {
            setCalendarioErro(error.message || 'Não foi possível carregar a disponibilidade deste anúncio.');
        } finally {
            setCalendarioLoading(false);
        }
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
        setTabDetalhe('detalhe');
        setCalendarioAnuncio([]);
        setCalendarioErro('');
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

        if (vistaAnterior === 'alugueres') {
            await carregarMeusAlugueres();
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
            showToast(err.message || 'Não foi possível criar o anúncio.');
            throw err;
        }
    };

    const abrirContactoAnunciante = () => {
        if (!anuncioSelecionado) return;
        setMostrarModalContacto(true);
    };

    const criarPedidoAluguer = async (payload: CriarPedidoAluguerPayload) => {
        if (!anuncioSelecionado) return;

        try {
            await marketplaceService.criarPedidoAluguer(anuncioSelecionado.ID_Artigo, payload);
            setMensagemFluxo(`Submeteste um pedido de aluguer para '${anuncioSelecionado.Nome}'.`);
            showToast('Pedido de aluguer submetido com sucesso.');
            await carregarCalendarioAnuncio(anuncioSelecionado.ID_Artigo);
        } catch (error: any) {
            showToast(error.message || 'Não foi possível submeter o pedido de aluguer.');
            throw error;
        }
    };

    const confirmarDevolucaoAluguer = async (idAluguer: number) => {
        if (!anuncioSelecionado) return;

        try {
            await marketplaceService.confirmarDevolucaoAluguer(idAluguer);
            setMensagemFluxo(`Confirmaste a devolução de um aluguer em '${anuncioSelecionado.Nome}'.`);
            showToast('Devolução confirmada com sucesso.');
            await carregarCalendarioAnuncio(anuncioSelecionado.ID_Artigo);
        } catch (error: any) {
            showToast(error.message || 'Não foi possível confirmar a devolução.');
            throw error;
        }
    };

    const aceitarPedidoAluguer = async (idPedido: number) => {
        try {
            await marketplaceService.aceitarPedidoAluguer(idPedido);
            showToast('Pedido de aluguer aceite com sucesso.');
            setMensagemFluxo('Aceitaste um pedido de aluguer.');
            await carregarMeusAlugueres();
        } catch (error: any) {
            showToast(error.message || 'Não foi possível aceitar o pedido de aluguer.');
        }
    };

    const rejeitarPedidoAluguer = async (idPedido: number) => {
        try {
            await marketplaceService.rejeitarPedidoAluguer(idPedido);
            showToast('Pedido de aluguer rejeitado.');
            setMensagemFluxo('Rejeitaste um pedido de aluguer.');
            await carregarMeusAlugueres();
        } catch (error: any) {
            showToast(error.message || 'Não foi possível rejeitar o pedido de aluguer.');
        }
    };

    const marcarAluguerComoDevolvido = async (idAluguer: number) => {
        try {
            await marketplaceService.marcarAluguerComoDevolvido(idAluguer);
            showToast('Aluguer marcado como devolvido.');
            setMensagemFluxo('Marcaste um aluguer como devolvido.');
            await carregarMeusAlugueres();
        } catch (error: any) {
            showToast(error.message || 'Não foi possível marcar o aluguer como devolvido.');
        }
    };

    const confirmarDevolucaoMeuAluguer = async (idAluguer: number) => {
        try {
            await marketplaceService.confirmarDevolucaoAluguer(idAluguer);
            showToast('Devolução confirmada com sucesso.');
            setMensagemFluxo('Confirmaste a devolução de um aluguer.');
            await carregarMeusAlugueres();
        } catch (error: any) {
            showToast(error.message || 'Não foi possível confirmar a devolução.');
        }
    };

    const abrirAnuncioPorId = async (idAnuncio: number) => {
        try {
            const anuncio = await marketplaceService.obterAnuncio(idAnuncio);
            abrirDetalhe(anuncio);
        } catch (error: any) {
            showToast(error.message || 'Não foi possível abrir o anúncio.');
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
            showToast(error.message || 'Não foi possível alterar o estado.');
        }
    };

    const abrirModalModeracao = (anuncio: Anuncio, acao: AcaoModeracao) => {
        setAnuncioSelecionado(anuncio);
        setAcaoModeracaoPendente(acao);
        setMotivoModeracao('');
        setMostrarModalModeracao(true);
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
            showToast(error.message || 'Não foi possível aplicar a moderação.');
        }
    };

    const podeRegistarInteresse = Boolean(
        anuncioSelecionado &&
        anuncioSelecionado.Tipo_Anuncio === TipoAnuncio.VENDA &&
        !isDono(anuncioSelecionado) &&
        anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO,
    );


    const obterUltimoRegistoModeracao = (anuncio?: Anuncio | null) => {
        if (!anuncio) return null;
        return ultimoRegistoModeracaoPorArtigo.get(anuncio.ID_Artigo) ?? null;
    };

    const obterAcaoPrincipalModeracao = (anuncio?: Anuncio | null): AcaoModeracao | null => {
        if (!isCoordenadora || !anuncio) return null;

        if (
            anuncio.Estado_Anuncio === EstadoAnuncio.REMOVIDO ||
            anuncio.Estado_Anuncio === EstadoAnuncio.ARQUIVADO
        ) {
            return 'reativar';
        }

        return 'remover';
    };

    const obterLabelAcaoModeracao = (acao: AcaoModeracao) => {
        const labels: Record<AcaoModeracao, string> = {
            remover: 'Remover por moderação',
            reativar: 'Reativar anúncio',
            arquivar: 'Arquivar por moderação',
        };

        return labels[acao];
    };

    const obterDescricaoAcaoModeracao = (acao: AcaoModeracao) => {
        const descricoes: Record<AcaoModeracao, string> = {
            remover: 'Remove o anúncio da montra pública e regista a decisão no histórico.',
            reativar: 'Volta a colocar o anúncio visível, mantendo o histórico anterior apenas como consulta.',
            arquivar: 'Arquiva o anúncio por decisão da coordenação.',
        };

        return descricoes[acao];
    };

    const acaoPrincipalAnuncioSelecionado = obterAcaoPrincipalModeracao(anuncioSelecionado);
    const ultimoRegistoAnuncioSelecionado = obterUltimoRegistoModeracao(anuncioSelecionado);

    const tabsDetalheDisponiveis: TabDetalhe[] = [
        'detalhe',
        ...(isAnuncioAluguer(anuncioSelecionado) ? ['disponibilidade' as const] : []),
    ];

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
                    <ButtonComponent className="btn-principal" onClick={() => setMostrarModalCriar(true)}>Novo anúncio</ButtonComponent>
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
                            <p>.</p>
                        </div>
                        <div className="tabs">
                            <ButtonComponent className={vista === 'montra' ? 'ativo' : ''} onClick={() => abrirVista('montra')}>Montra</ButtonComponent>
                            <ButtonComponent className={vista === 'meus' ? 'ativo' : ''} onClick={() => abrirVista('meus')}>Meus anúncios</ButtonComponent>
                            <ButtonComponent className={vista === 'alugueres' ? 'ativo' : ''} onClick={() => abrirVista('alugueres')}>Meus alugueres</ButtonComponent>
                            {isCoordenadora ? <ButtonComponent className={vista === 'moderacao' ? 'ativo' : ''} onClick={() => abrirVista('moderacao')}>Moderação</ButtonComponent> : null}
                        </div>
                    </div>

                    {vista !== 'alugueres' ? (
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
                            </select>
                        </div>
                    ) : null}

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
                                        <ButtonComponent className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver detalhe</ButtonComponent>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && vista === 'detalhe' && anuncioSelecionado && (
                        <div className="detalhe-anuncio">
                            <ButtonComponent className="btn-link" onClick={() => setVista(vistaAnterior)}>Voltar</ButtonComponent>
                            <div className={`detalhe-grid ${tabDetalhe === 'disponibilidade' ? 'detalhe-grid-disponibilidade' : ''}`}>
                                <div className="detalhe-principal">
                                    <img className="detalhe-imagem" src={anuncioSelecionado.Foto || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop'} alt={anuncioSelecionado.Nome} />
                                    <div className="detalhe-etiquetas">
                                        <span className={`badge-estado estado-${anuncioSelecionado.Estado_Anuncio}`}>{ESTADO_LABEL[anuncioSelecionado.Estado_Anuncio]}</span>
                                        <span className="badge-outline">{ORIGEM_LABEL[anuncioSelecionado.Origem_Registo]}</span>
                                        <span className="badge-outline">{TIPO_LABEL[anuncioSelecionado.Tipo_Anuncio]}</span>
                                    </div>
                                    <h2>{anuncioSelecionado.Nome}</h2>
                                    <p>{anuncioSelecionado.Descricao || 'Sem descrição.'}</p>
                                    {anuncioSelecionado.Tipo_Anuncio === TipoAnuncio.ALUGUER && anuncioSelecionado.Aluguer_Continuo ? (
                                        <div className="bloco-nota-moderacao">
                                            <span>Modalidade de aluguer</span>
                                            <strong>Aluguer contínuo ativo</strong>
                                        </div>
                                    ) : null}
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
                                <div className="detalhe-painel">
                                    <div className="detalhe-tabs">
                                        {tabsDetalheDisponiveis.map((tab) => (
                                            <button
                                                key={tab}
                                                type="button"
                                                className={tabDetalhe === tab ? 'ativo' : ''}
                                                onClick={() => setTabDetalhe(tab)}
                                            >
                                                {tab === 'detalhe' ? 'Detalhe' : 'Disponibilidade'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="detalhe-painel-conteudo">
                                        {tabDetalhe === 'detalhe' ? (
                                            <div className="detalhe-tab detalhe-conteudo-tab">
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
                                                        {podeRegistarInteresse ? <ButtonComponent className="btn-principal" onClick={abrirContactoAnunciante}>Tenho interesse</ButtonComponent> : null}

                                                        {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO ? (
                                                            <ButtonComponent className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.RESERVADO)}>Marcar como reservado</ButtonComponent>
                                                        ) : null}
                                                        {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.RESERVADO ? (
                                                            <ButtonComponent className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.ATIVO)}>Reativar anúncio</ButtonComponent>
                                                        ) : null}
                                                        {isDono(anuncioSelecionado) && (anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.ATIVO || anuncioSelecionado.Estado_Anuncio === EstadoAnuncio.RESERVADO) ? (
                                                            <ButtonComponent className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.CONCLUIDO)}>Marcar como concluído</ButtonComponent>
                                                        ) : null}
                                                        {isDono(anuncioSelecionado) && anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.ARQUIVADO && anuncioSelecionado.Estado_Anuncio !== EstadoAnuncio.REMOVIDO ? (
                                                            <ButtonComponent className="btn-secundario" onClick={() => alterarEstado(EstadoAnuncio.ARQUIVADO)}>Arquivar anúncio</ButtonComponent>
                                                        ) : null}
                                                        {isCoordenadora && acaoPrincipalAnuncioSelecionado ? (
                                                            <ButtonComponent
                                                                className={acaoPrincipalAnuncioSelecionado === 'remover' ? 'btn-perigo' : 'btn-secundario'}
                                                                onClick={() => abrirModalModeracao(anuncioSelecionado, acaoPrincipalAnuncioSelecionado)}
                                                            >
                                                                {obterLabelAcaoModeracao(acaoPrincipalAnuncioSelecionado)}
                                                            </ButtonComponent>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        {tabDetalhe === 'disponibilidade' && isAnuncioAluguer(anuncioSelecionado) ? (
                                            <AnuncioDisponibilidade
                                                anuncio={anuncioSelecionado}
                                                calendario={calendarioAnuncio}
                                                loading={calendarioLoading}
                                                erro={calendarioErro}
                                                isDono={isDono(anuncioSelecionado)}
                                                onCriarPedido={criarPedidoAluguer}
                                                onConfirmarDevolucao={confirmarDevolucaoAluguer}
                                            />
                                        ) : null}

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
                                        <ButtonComponent className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver</ButtonComponent>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}



                    {!loading && vista === 'alugueres' && (
                        <MeusAlugueres
                            itens={meusAlugueres}
                            loading={meusAlugueresLoading}
                            erro={meusAlugueresErro}
                            onVerAnuncio={abrirAnuncioPorId}
                            onAceitarPedido={aceitarPedidoAluguer}
                            onRejeitarPedido={rejeitarPedidoAluguer}
                            onMarcarComoDevolvido={marcarAluguerComoDevolvido}
                            onConfirmarDevolucao={confirmarDevolucaoMeuAluguer}
                        />
                    )}

                    {!loading && vista === 'moderacao' && isCoordenadora && (
                        <div className="moderacao-layout">
                            {anunciosModeracao.length === 0 ? (
                                <div className="estado-vazio">Não existem anúncios para moderar.</div>
                            ) : (
                                <div className="moderacao-lista">
                                    {anunciosModeracao.map((anuncio) => {
                                        const ultimoRegisto = obterUltimoRegistoModeracao(anuncio);
                                        const acaoPrincipal = obterAcaoPrincipalModeracao(anuncio);

                                        return (
                                            <div key={anuncio.ID_Artigo} className="moderacao-card">
                                                <div>
                                                    <div className="linha-topo">
                                                        <span className={`badge-estado estado-${anuncio.Estado_Anuncio}`}>{ESTADO_LABEL[anuncio.Estado_Anuncio]}</span>
                                                        <span className="badge-outline">{TIPO_LABEL[anuncio.Tipo_Anuncio]}</span>
                                                        <span className="badge-outline">{ORIGEM_LABEL[anuncio.Origem_Registo]}</span>
                                                    </div>
                                                    <strong>{anuncio.Nome}</strong>
                                                    <p>Publicado por {getNomeCriador(anuncio)}</p>
                                                    {ultimoRegisto ? (
                                                        <small>
                                                            Última ação: {ultimoRegisto.Acao} · {ultimoRegisto.Motivo || 'Sem motivo indicado'} · {formatarData(ultimoRegisto.Data_Registo)}
                                                        </small>
                                                    ) : (
                                                        <small>Sem histórico de moderação.</small>
                                                    )}
                                                </div>

                                                <div className="linha-acoes">
                                                    <ButtonComponent className="btn-secundario" onClick={() => abrirDetalhe(anuncio)}>Ver anúncio</ButtonComponent>
                                                    {acaoPrincipal ? (
                                                        <ButtonComponent
                                                            className={acaoPrincipal === 'remover' ? 'btn-perigo' : 'btn-secundario'}
                                                            onClick={() => abrirModalModeracao(anuncio, acaoPrincipal)}
                                                        >
                                                            {obterLabelAcaoModeracao(acaoPrincipal)}
                                                        </ButtonComponent>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ModalCriarAnuncio
                isOpen={mostrarModalCriar}
                onClose={() => setMostrarModalCriar(false)}
                onGuardar={executarCriacaoAnuncio}
            />

            {mostrarModalContacto && anuncioSelecionado && (
                <div className="modal-overlay" onClick={() => setMostrarModalContacto(false)}>
                    <div className="modal-card modal-contacto-anunciante" onClick={(e) => e.stopPropagation()}>
                        <h3>Contacto do anunciante</h3>
                        <p className="texto-ajuda">
                            Informação de contacto associada ao anúncio <strong>{anuncioSelecionado.Nome}</strong>.
                        </p>

                        <div className="contacto-anunciante-info">
                            <div>
                                <span>Nome</span>
                                <strong>{getNomeCriador(anuncioSelecionado)}</strong>
                            </div>
                            <div>
                                <span>Telefone</span>
                                <strong>{getTelefoneCriador(anuncioSelecionado)}</strong>
                            </div>
                        </div>

                        <div className="modal-acoes">
                            <ButtonComponent className="btn-principal" onClick={() => setMostrarModalContacto(false)}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalModeracao && anuncioSelecionado && (
                <div className="modal-overlay" onClick={() => setMostrarModalModeracao(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>{obterLabelAcaoModeracao(acaoModeracaoPendente)}</h3>
                        <p className="texto-ajuda">Anúncio: <strong>{anuncioSelecionado.Nome}</strong></p>
                        <p className="texto-ajuda">{obterDescricaoAcaoModeracao(acaoModeracaoPendente)}</p>
                        <textarea
                            placeholder={acaoModeracaoPendente === 'reativar' ? 'Nota opcional da reativação' : 'Motivo da moderação'}
                            value={motivoModeracao}
                            onChange={(e) => setMotivoModeracao(e.target.value)}
                        />
                        <div className="modal-acoes">
                            <ButtonComponent className="btn-secundario" onClick={() => setMostrarModalModeracao(false)}>Cancelar</ButtonComponent>
                            <ButtonComponent
                                className={acaoModeracaoPendente === 'remover' ? 'btn-perigo' : 'btn-principal'}
                                onClick={() => executarAcaoModeracao(acaoModeracaoPendente)}
                            >
                                Confirmar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
