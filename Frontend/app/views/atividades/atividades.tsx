import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useMemo, useState } from 'react';
import { marketplaceService } from '../../services/marketplace.service';
import { EstadoAnuncio } from '../../types/marketplace.types';
import type { RegistoModeracaoMarketplace } from '../../types/marketplace.types';
import './atividades.scss';

import { showToast } from '~/components/toast/toast';

type FiltroAcao = 'todas' | 'remover' | 'reativar' | 'arquivar';

type GrupoModeracao = {
    idArtigo: number;
    nomeArtigo: string;
    estadoAtual: string;
    ultimoRegisto: RegistoModeracaoMarketplace;
    historico: RegistoModeracaoMarketplace[];
};

export function Atividades() {
    const [registos, setRegistos] = useState<RegistoModeracaoMarketplace[]>([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [pesquisa, setPesquisa] = useState('');
    const [acaoFiltro, setAcaoFiltro] = useState<FiltroAcao>('todas');

    const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoModeracao | null>(null);
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

    const formatarEstadoAnterior = (registo: RegistoModeracaoMarketplace) => {
        if (registo.Estado_Anterior) {
            return formatarEstado(registo.Estado_Anterior);
        }

        return 'Não registado';
    };

    const gruposModeracao = useMemo<GrupoModeracao[]>(() => {
        const mapa = new Map<number, RegistoModeracaoMarketplace[]>();

        registos.forEach((registo) => {
            const lista = mapa.get(registo.ID_Artigo) ?? [];
            lista.push(registo);
            mapa.set(registo.ID_Artigo, lista);
        });

        return Array.from(mapa.entries())
            .map(([idArtigo, historico]) => {
                const historicoOrdenado = [...historico].sort(
                    (a, b) => new Date(b.Data_Registo).getTime() - new Date(a.Data_Registo).getTime(),
                );
                const ultimoRegisto = historicoOrdenado[0];

                return {
                    idArtigo,
                    nomeArtigo: obterNomeArtigo(ultimoRegisto),
                    estadoAtual: ultimoRegisto.Artigo?.Estado_Anuncio ?? ultimoRegisto.Estado_Novo,
                    ultimoRegisto,
                    historico: historicoOrdenado,
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.ultimoRegisto.Data_Registo).getTime() -
                    new Date(a.ultimoRegisto.Data_Registo).getTime(),
            );
    }, [registos]);

    const gruposFiltrados = useMemo(() => {
        const termo = pesquisa.trim().toLowerCase();

        return gruposModeracao.filter((grupo) => {
            const textoGrupo = [
                grupo.nomeArtigo,
                grupo.estadoAtual,
                grupo.ultimoRegisto.Motivo ?? '',
                obterNomeModerador(grupo.ultimoRegisto),
                ...grupo.historico.map((registo) => `${registo.Acao} ${registo.Motivo ?? ''} ${obterNomeModerador(registo)}`),
            ]
                .join(' ')
                .toLowerCase();

            const passaPesquisa = !termo || textoGrupo.includes(termo);
            const passaAcao = acaoFiltro === 'todas' || grupo.ultimoRegisto.Acao === acaoFiltro;

            return passaPesquisa && passaAcao;
        });
    }, [gruposModeracao, pesquisa, acaoFiltro]);

    const abrirModal = (grupo: GrupoModeracao) => {
        setGrupoSelecionado(grupo);
    };

    const fecharModal = () => {
        setGrupoSelecionado(null);
    };

    const podeReativarGrupo = (grupo: GrupoModeracao) => {
        return grupo.estadoAtual === EstadoAnuncio.REMOVIDO || grupo.estadoAtual === 'removido';
    };

    const reativarAnuncio = async (grupo: GrupoModeracao) => {
        const confirmar = window.confirm(`Pretendes reativar o anúncio "${grupo.nomeArtigo}"?`);
        if (!confirmar) return;

        try {
            setAReativar(grupo.idArtigo);

            await marketplaceService.moderarAnuncio(
                grupo.idArtigo,
                'reativar',
                'Reativado através do registo de moderação.',
            );

            await carregarRegistoModeracao();

            if (grupoSelecionado?.idArtigo === grupo.idArtigo) {
                fecharModal();
            }

            showToast('Anúncio reativado com sucesso.');
        } catch (error) {
            const mensagem =
                error instanceof Error
                    ? error.message
                    : 'Não foi possível reativar o anúncio.';

            showToast(mensagem);
        } finally {
            setAReativar(null);
        }
    };

    return (
        <div className="atividades-container">
            <section className="atividades-header card-header-claro">
                <div>
                    <span className="eyebrow">Marketplace</span>
                    <h1>Registo de Moderação</h1>
                    <p>
                        Consulta o histórico de ações da coordenação. Cada anúncio aparece uma única vez, mesmo que tenha vários registos de moderação.
                    </p>
                </div>

                <ButtonComponent className="btn-secundario" onClick={carregarRegistoModeracao} disabled={loading}>
                    Atualizar
                </ButtonComponent>
            </section>

            <section className="cartao-branco">
                <div className="toolbar">
                    <div>
                        <h2>Histórico por anúncio</h2>
                        <p>O histórico é informativo. A ação disponível depende apenas do estado atual do anúncio.</p>
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
                            <option value="remover">Última ação: removidos</option>
                            <option value="reativar">Última ação: reativados</option>
                            <option value="arquivar">Última ação: arquivados</option>
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

                {!loading && !erro && gruposFiltrados.length === 0 && (
                    <div className="mensagem-centro">
                        Ainda não existem anúncios para os filtros selecionados.
                    </div>
                )}

                {!loading && !erro && gruposFiltrados.length > 0 && (
                    <div className="tabela-wrapper">
                        <table className="tabela-registos">
                            <thead>
                                <tr>
                                    <th>Anúncio</th>
                                    <th>Estado atual</th>
                                    <th>Última ação</th>
                                    <th>Última transição</th>
                                    <th>Motivo</th>
                                    <th>Moderador</th>
                                    <th>Histórico</th>
                                    <th>Ação atual</th>
                                </tr>
                            </thead>

                            <tbody>
                                {gruposFiltrados.map((grupo) => (
                                    <tr key={grupo.idArtigo}>
                                        <td>
                                            <strong>{grupo.nomeArtigo}</strong>
                                            <span>#{grupo.idArtigo}</span>
                                        </td>

                                        <td>{formatarEstado(grupo.estadoAtual)}</td>

                                        <td>
                                            <span className={classeAcao(grupo.ultimoRegisto.Acao)}>
                                                {formatarAcao(grupo.ultimoRegisto.Acao)}
                                            </span>
                                            <span>{formatarData(grupo.ultimoRegisto.Data_Registo)}</span>
                                        </td>

                                        <td>
                                            <span className="estado-transicao">
                                                {formatarEstadoAnterior(grupo.ultimoRegisto)} → {formatarEstado(grupo.ultimoRegisto.Estado_Novo)}
                                            </span>
                                        </td>

                                        <td>{grupo.ultimoRegisto.Motivo || 'Sem motivo indicado'}</td>

                                        <td>{obterNomeModerador(grupo.ultimoRegisto)}</td>

                                        <td>
                                            <ButtonComponent
                                                className="btn-tabela btn-ver"
                                                onClick={() => abrirModal(grupo)}
                                            >
                                                Ver {grupo.historico.length} registo{grupo.historico.length === 1 ? '' : 's'}
                                            </ButtonComponent>
                                        </td>

                                        <td>
                                            {podeReativarGrupo(grupo) ? (
                                                <ButtonComponent
                                                    className="btn-tabela btn-reativar"
                                                    onClick={() => reativarAnuncio(grupo)}
                                                    disabled={aReativar === grupo.idArtigo}
                                                >
                                                    {aReativar === grupo.idArtigo ? 'A reativar...' : 'Reativar'}
                                                </ButtonComponent>
                                            ) : (
                                                <span className="acao-indisponivel">Sem ação</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {grupoSelecionado && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-registo" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Anúncio</span>
                                <h3>{grupoSelecionado.nomeArtigo}</h3>
                                <p>Estado atual: {formatarEstado(grupoSelecionado.estadoAtual)}</p>
                            </div>

                            <ButtonComponent className="btn-fechar" onClick={fecharModal}>
                                ×
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <div className="modal-grid">
                                <div>
                                    <label>ID do artigo</label>
                                    <p>#{grupoSelecionado.idArtigo}</p>
                                </div>

                                <div>
                                    <label>Total de registos</label>
                                    <p>{grupoSelecionado.historico.length}</p>
                                </div>

                                <div>
                                    <label>Última ação</label>
                                    <p>{formatarAcao(grupoSelecionado.ultimoRegisto.Acao)}</p>
                                </div>

                                <div>
                                    <label>Última data</label>
                                    <p>{formatarData(grupoSelecionado.ultimoRegisto.Data_Registo)}</p>
                                </div>
                            </div>

                            <div className="bloco-texto">
                                <label>Regra aplicada</label>
                                <p>
                                    O botão de reativar aparece apenas uma vez porque é calculado pelo estado atual do anúncio. Os registos abaixo são apenas histórico.
                                </p>
                            </div>

                            <div className="historico-moderacao-lista">
                                {grupoSelecionado.historico.map((registo) => (
                                    <article key={registo.ID_Registo_Moderacao} className="historico-moderacao-item">
                                        <div>
                                            <span className={classeAcao(registo.Acao)}>
                                                {formatarAcao(registo.Acao)}
                                            </span>
                                            <strong>{registo.Motivo || 'Sem motivo indicado'}</strong>
                                            <p>{formatarEstadoAnterior(registo)} → {formatarEstado(registo.Estado_Novo)}</p>
                                        </div>

                                        <div>
                                            <small>{formatarData(registo.Data_Registo)}</small>
                                            <small>{obterNomeModerador(registo)}</small>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            {podeReativarGrupo(grupoSelecionado) && (
                                <ButtonComponent
                                    className="btn-primario"
                                    onClick={() => reativarAnuncio(grupoSelecionado)}
                                    disabled={aReativar === grupoSelecionado.idArtigo}
                                >
                                    {aReativar === grupoSelecionado.idArtigo ? 'A reativar...' : 'Reativar anúncio'}
                                </ButtonComponent>
                            )}

                            <ButtonComponent className="btn-secundario" onClick={fecharModal}>
                                Fechar
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
