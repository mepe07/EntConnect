import React, { useEffect, useMemo, useState } from 'react';
import { marketplaceService } from '../../services/marketplace.service';
import { EstadoAnuncio } from '../../types/marketplace.types';
import type { RegistoModeracaoMarketplace } from '../../types/marketplace.types';
import './atividades.scss';

type FiltroAcao = 'todas' | 'remover' | 'reativar' | 'arquivar';

export function Atividades() {
    const [registos, setRegistos] = useState<RegistoModeracaoMarketplace[]>([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [pesquisa, setPesquisa] = useState('');
    const [acaoFiltro, setAcaoFiltro] = useState<FiltroAcao>('todas');

    const [registoSelecionado, setRegistoSelecionado] = useState<RegistoModeracaoMarketplace | null>(null);
    const [aReativar, setAReativar] = useState<number | null>(null);

    useEffect(() => {
        carregarRegistoModeracao();
    }, []);

    const carregarRegistoModeracao = async () => {
        setLoading(true);
        setErro(null);

        try {
            const dados = await marketplaceService.listarRegistoModeracao();
            setRegistos(dados);
        } catch (error) {
            const mensagem =
                error instanceof Error
                    ? error.message
                    : 'Erro ao carregar o registo de moderação.';

            setErro(mensagem);
        } finally {
            setLoading(false);
        }
    };

    const obterNomeArtigo = (registo: RegistoModeracaoMarketplace) => {
        return registo.Artigo?.Nome ?? `Artigo #${registo.ID_Artigo}`;
    };

    const obterNomeModerador = (registo: RegistoModeracaoMarketplace) => {
        return registo.Utilizador?.Pessoa?.Nome
            ?? registo.Utilizador_Moderador?.Pessoa?.Nome
            ?? `Utilizador #${registo.ID_Utilizador_Moderador}`;
    };

    const registosFiltrados = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return registos.filter((registo) => {
            const nomeArtigo = obterNomeArtigo(registo).toLowerCase();
            const motivo = (registo.Motivo ?? '').toLowerCase();
            const moderador = obterNomeModerador(registo).toLowerCase();
            const acao = registo.Acao.toLowerCase();

            const passaPesquisa =
                !termo ||
                nomeArtigo.includes(termo) ||
                motivo.includes(termo) ||
                moderador.includes(termo) ||
                acao.includes(termo);

            const passaAcao = acaoFiltro === 'todas' || registo.Acao === acaoFiltro;

            return passaPesquisa && passaAcao;
        });
    }, [registos, pesquisa, acaoFiltro]);

    const formatarData = (data?: string) => {
        if (!data) return '-';

        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(data));
    };

    const formatarAcao = (acao: string) => {
        const labels: Record<string, string> = {
            remover: 'Removido',
            reativar: 'Reativado',
            arquivar: 'Arquivado',
            moderacao: 'Moderação',
        };

        return labels[acao] ?? acao;
    };

    const formatarEstado = (estado?: string | null) => {
        if (!estado) return '-';

        const labels: Record<string, string> = {
            [EstadoAnuncio.ATIVO]: 'Ativo',
            [EstadoAnuncio.RESERVADO]: 'Reservado',
            [EstadoAnuncio.CONCLUIDO]: 'Concluído',
            [EstadoAnuncio.ARQUIVADO]: 'Arquivado',
            [EstadoAnuncio.REMOVIDO]: 'Removido',
        };

        return labels[estado] ?? estado;
    };

    const classeAcao = (acao: string) => {
        switch (acao) {
            case 'remover':
                return 'badge badge-vermelha';
            case 'reativar':
                return 'badge badge-verde';
            case 'arquivar':
                return 'badge badge-cinzenta';
            default:
                return 'badge badge-azul';
        }
    };

    const abrirModal = (registo: RegistoModeracaoMarketplace) => {
        setRegistoSelecionado(registo);
    };

    const fecharModal = () => {
        setRegistoSelecionado(null);
    };

    const podeReativar = (registo: RegistoModeracaoMarketplace) => {
        const estadoAtual = registo.Artigo?.Estado_Anuncio ?? registo.Estado_Novo;

        return estadoAtual === EstadoAnuncio.REMOVIDO || estadoAtual === 'removido';
    };

    const reativarAnuncio = async (registo: RegistoModeracaoMarketplace) => {
        const confirmar = window.confirm(`Pretendes reativar o anúncio "${obterNomeArtigo(registo)}"?`);
        if (!confirmar) return;

        try {
            setAReativar(registo.ID_Artigo);

            await marketplaceService.moderarAnuncio(
                registo.ID_Artigo,
                'reativar',
                'Reativado através do registo de moderação.',
            );

            await carregarRegistoModeracao();

            // Se o modal estiver aberto no mesmo anúncio, fecha para evitar informação desatualizada
            if (registoSelecionado?.ID_Artigo === registo.ID_Artigo) {
                fecharModal();
            }
        } catch (error) {
            const mensagem =
                error instanceof Error
                    ? error.message
                    : 'Não foi possível reativar o anúncio.';

            alert(mensagem);
        } finally {
            setAReativar(null);
        }
    };

    const formatarEstadoAnterior = (registo: RegistoModeracaoMarketplace) => {
        if (registo.Estado_Anterior) {
            return formatarEstado(registo.Estado_Anterior);
        }

        return 'Não registado';
    };

    return (
        <div className="atividades-container">
            <section className="atividades-header card-header-claro">
                <div>
                    <span className="eyebrow">Marketplace</span>
                    <h1>Registo de Moderação</h1>
                    <p>
                        Consulta o histórico de ações feitas pela coordenação nos anúncios do Marketplace.
                    </p>
                </div>

                <button className="btn-secundario" onClick={carregarRegistoModeracao} disabled={loading}>
                    Atualizar
                </button>
            </section>

            <section className="cartao-branco">
                <div className="toolbar">
                    <div>
                        <h2>Histórico de decisões</h2>
                        <p>Registos ordenados dos mais recentes para os mais antigos.</p>
                    </div>

                    <div className="filtros">
                        <input
                            type="text"
                            value={pesquisa}
                            onChange={(event) => setPesquisa(event.target.value)}
                            placeholder="Pesquisar por anúncio, motivo ou moderador..."
                        />

                        <select
                            value={acaoFiltro}
                            onChange={(event) => setAcaoFiltro(event.target.value as FiltroAcao)}
                        >
                            <option value="todas">Todas as ações</option>
                            <option value="remover">Removidos</option>
                            <option value="reativar">Reativados</option>
                            <option value="arquivar">Arquivados</option>
                        </select>
                    </div>
                </div>

                {loading && (
                    <div className="mensagem-centro">
                        A carregar registo de moderação...
                    </div>
                )}

                {!loading && erro && (
                    <div className="mensagem-erro">
                        {erro}
                    </div>
                )}

                {!loading && !erro && registosFiltrados.length === 0 && (
                    <div className="mensagem-centro">
                        Ainda não existem registos de moderação para os filtros selecionados.
                    </div>
                )}

                {!loading && !erro && registosFiltrados.length > 0 && (
                    <div className="tabela-wrapper">
                        <table className="tabela-registos">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Anúncio</th>
                                    <th>Ação</th>
                                    <th>Transição</th>
                                    <th>Motivo</th>
                                    <th>Moderador</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {registosFiltrados.map((registo) => (
                                    <tr key={registo.ID_Registo_Moderacao}>
                                        <td>{formatarData(registo.Data_Registo)}</td>

                                        <td>
                                            <strong>{obterNomeArtigo(registo)}</strong>
                                            <span>#{registo.ID_Artigo}</span>
                                        </td>

                                        <td>
                                            <span className={classeAcao(registo.Acao)}>
                                                {formatarAcao(registo.Acao)}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="estado-transicao">
                                                {formatarEstadoAnterior(registo)} → {formatarEstado(registo.Estado_Novo)}
                                            </span>
                                        </td>

                                        <td>{registo.Motivo || 'Sem motivo indicado'}</td>

                                        <td>{obterNomeModerador(registo)}</td>

                                        <td>
                                            <div className="acoes-linha">
                                                <button
                                                    className="btn-tabela btn-ver"
                                                    onClick={() => abrirModal(registo)}
                                                >
                                                    Ver
                                                </button>

                                                {podeReativar(registo) && (
                                                    <button
                                                        className="btn-tabela btn-reativar"
                                                        onClick={() => reativarAnuncio(registo)}
                                                        disabled={aReativar === registo.ID_Artigo}
                                                    >
                                                        {aReativar === registo.ID_Artigo ? 'A reativar...' : 'Reativar'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {registoSelecionado && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-registo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Anúncio</span>
                                <h3>{obterNomeArtigo(registoSelecionado)}</h3>
                            </div>

                            <button className="btn-fechar" onClick={fecharModal}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-grid">
                                <div>
                                    <label>ID do artigo</label>
                                    <p>#{registoSelecionado.ID_Artigo}</p>
                                </div>

                                <div>
                                    <label>Ação</label>
                                    <p>{formatarAcao(registoSelecionado.Acao)}</p>
                                </div>

                                <div>
                                    <label>Data</label>
                                    <p>{formatarData(registoSelecionado.Data_Registo)}</p>
                                </div>

                                <div>
                                    <label>Moderador</label>
                                    <p>{obterNomeModerador(registoSelecionado)}</p>
                                </div>

                                <div>
                                    <label>Estado anterior</label>
                                    <p>{formatarEstado(registoSelecionado.Estado_Anterior)}</p>
                                </div>

                                <div>
                                    <label>Estado novo</label>
                                    <p>{formatarEstado(registoSelecionado.Estado_Novo)}</p>
                                </div>

                                <div>
                                    <label>Tipo de anúncio</label>
                                    <p>{registoSelecionado.Artigo?.Tipo_Anuncio ?? '-'}</p>
                                </div>

                                <div>
                                    <label>Origem do registo</label>
                                    <p>{registoSelecionado.Artigo?.Origem_Registo ?? '-'}</p>
                                </div>
                            </div>

                            <div className="bloco-texto">
                                <label>Motivo</label>
                                <p>{registoSelecionado.Motivo || 'Sem motivo indicado.'}</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            {podeReativar(registoSelecionado) && (
                                <button
                                    className="btn-primario"
                                    onClick={() => reativarAnuncio(registoSelecionado)}
                                    disabled={aReativar === registoSelecionado.ID_Artigo}
                                >
                                    {aReativar === registoSelecionado.ID_Artigo ? 'A reativar...' : 'Reativar anúncio'}
                                </button>
                            )}

                            <button className="btn-secundario" onClick={fecharModal}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 