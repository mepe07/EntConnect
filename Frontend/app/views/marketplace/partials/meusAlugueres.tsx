import React, { useMemo, useState } from 'react';
import { ButtonComponent } from '~/components/button/button.component';
import type { EstadoMeuAluguer, MeuAluguer, PapelMeuAluguer } from '../../../types/marketplace.types';

type VistaMeusAlugueres = 'calendario' | 'lista';
type FiltroPapel = 'todos' | PapelMeuAluguer;
type FiltroEstado = 'todos' | EstadoMeuAluguer;

type DiaCalendario = {
    data: Date;
    pertenceAoMes: boolean;
};

interface MeusAlugueresProps {
    itens: MeuAluguer[];
    loading: boolean;
    erro: string;
    onVerAnuncio: (idAnuncio: number) => void;
    onAceitarPedido: (idPedido: number) => void;
    onRejeitarPedido: (idPedido: number) => void;
    onMarcarComoDevolvido: (idAluguer: number) => void;
    onConfirmarDevolucao: (idAluguer: number) => void;
}

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MESES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

const ESTADO_LABEL: Record<string, string> = {
    pendente: 'Pendente',
    reservado: 'Reservado',
    ativo: 'Em curso',
    devolucao_pendente: 'Devolução pendente',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    rejeitado: 'Rejeitado',
};

const PAPEL_LABEL: Record<PapelMeuAluguer, string> = {
    interessado: 'Aluguer que pedi',
    dono: 'Artigo meu',
};

function parseData(valor: string) {
    if (!valor) return new Date();
    if (valor.includes('T')) return new Date(valor);

    return new Date(`${valor}T00:00:00`);
}

function paraISO(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function formatarData(valor?: string | null) {
    if (!valor) return '--';

    try {
        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(parseData(valor));
    } catch {
        return valor;
    }
}

function gerarDiasDoMes(dataBase: Date): DiaCalendario[] {
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth();
    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);
    const inicioSemana = primeiroDiaMes.getDay() === 0 ? 6 : primeiroDiaMes.getDay() - 1;
    const dias: DiaCalendario[] = [];

    for (let i = inicioSemana - 1; i >= 0; i -= 1) {
        dias.push({
            data: new Date(ano, mes, -i),
            pertenceAoMes: false,
        });
    }

    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia += 1) {
        dias.push({
            data: new Date(ano, mes, dia),
            pertenceAoMes: true,
        });
    }

    while (dias.length % 7 !== 0) {
        const ultimo = dias[dias.length - 1].data;
        dias.push({
            data: new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1),
            pertenceAoMes: false,
        });
    }

    return dias;
}

function itemOcorreNoDia(item: MeuAluguer, data: Date) {
    const iso = paraISO(data);
    const inicio = item.inicio?.slice(0, 10);
    const fim = item.fim?.slice(0, 10);

    return Boolean(inicio && fim && iso >= inicio && iso <= fim);
}

function getChaveItem(item: MeuAluguer) {
    return `${item.tipoRegisto}-${item.id}`;
}

function getEstadoClasse(estado: EstadoMeuAluguer) {
    return `estado-meu-aluguer-${estado}`;
}

function ordenarItens(itemA: MeuAluguer, itemB: MeuAluguer) {
    const prioridade: Record<string, number> = {
        pendente: 1,
        devolucao_pendente: 2,
        ativo: 3,
        reservado: 4,
        concluido: 5,
        cancelado: 6,
        rejeitado: 7,
    };

    const estadoA = prioridade[itemA.estado] ?? 99;
    const estadoB = prioridade[itemB.estado] ?? 99;

    if (estadoA !== estadoB) return estadoA - estadoB;

    return parseData(itemA.inicio).getTime() - parseData(itemB.inicio).getTime();
}

export function MeusAlugueres({
    itens,
    loading,
    erro,
    onVerAnuncio,
    onAceitarPedido,
    onRejeitarPedido,
    onMarcarComoDevolvido,
    onConfirmarDevolucao,
}: MeusAlugueresProps) {
    const [vista, setVista] = useState<VistaMeusAlugueres>('calendario');
    const [pesquisa, setPesquisa] = useState('');
    const [filtroPapel, setFiltroPapel] = useState<FiltroPapel>('todos');
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
    const [mesAtual, setMesAtual] = useState(() => new Date());
    const [chaveSelecionada, setChaveSelecionada] = useState<string | null>(null);

    const itensFiltrados = useMemo(() => {
        const textoPesquisa = pesquisa.trim().toLowerCase();

        return itens
            .filter((item) => {
                const texto = [
                    item.artigo,
                    item.categoria,
                    item.outraPessoa,
                    item.origem,
                    item.estado,
                    item.papel,
                ]
                    .join(' ')
                    .toLowerCase();

                const correspondePesquisa = !textoPesquisa || texto.includes(textoPesquisa);
                const correspondePapel = filtroPapel === 'todos' || item.papel === filtroPapel;
                const correspondeEstado = filtroEstado === 'todos' || item.estado === filtroEstado;

                return correspondePesquisa && correspondePapel && correspondeEstado;
            })
            .sort(ordenarItens);
    }, [itens, pesquisa, filtroPapel, filtroEstado]);

    const itemSelecionado = useMemo(() => {
        if (!itensFiltrados.length) return null;

        return itensFiltrados.find((item) => getChaveItem(item) === chaveSelecionada) ?? itensFiltrados[0];
    }, [itensFiltrados, chaveSelecionada]);

    const dias = useMemo(() => gerarDiasDoMes(mesAtual), [mesAtual]);

    function mudarMes(offset: number) {
        setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + offset, 1));
    }

    function selecionarItem(item: MeuAluguer) {
        setChaveSelecionada(getChaveItem(item));
    }

    return (
        <div className="meus-alugueres">
            <div className="meus-alugueres-topo">
                <div>
                    <h3>Os meus alugueres</h3>
                    <p>Consulta pedidos, reservas, alugueres em curso e devoluções associadas a ti.</p>
                </div>

                <div className="meus-alugueres-vistas">
                    <button
                        type="button"
                        className={vista === 'calendario' ? 'ativo' : ''}
                        onClick={() => setVista('calendario')}
                    >
                        Calendário
                    </button>
                    <button
                        type="button"
                        className={vista === 'lista' ? 'ativo' : ''}
                        onClick={() => setVista('lista')}
                    >
                        Lista
                    </button>
                </div>
            </div>

            <div className="meus-alugueres-filtros">
                <input
                    value={pesquisa}
                    onChange={(event) => setPesquisa(event.target.value)}
                    placeholder="Pesquisar artigo, categoria ou pessoa"
                />

                <select value={filtroPapel} onChange={(event) => setFiltroPapel(event.target.value as FiltroPapel)}>
                    <option value="todos">Todos os papéis</option>
                    <option value="interessado">Alugueres que pedi</option>
                    <option value="dono">Artigos meus</option>
                </select>

                <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as FiltroEstado)}>
                    <option value="todos">Todos os estados</option>
                    <option value="pendente">Pendente</option>
                    <option value="reservado">Reservado</option>
                    <option value="ativo">Em curso</option>
                    <option value="devolucao_pendente">Devolução pendente</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="rejeitado">Rejeitado</option>
                </select>
            </div>

            {erro ? <div className="mensagem-erro">{erro}</div> : null}
            {loading ? <div className="estado-vazio">A carregar alugueres...</div> : null}

            {!loading && !erro ? (
                <div className="meus-alugueres-grid">
                    {vista === 'calendario' ? (
                        <section className="meus-alugueres-calendario">
                            <div className="meus-alugueres-calendario-cabecalho">
                                <div>
                                    <h4>Calendário dos alugueres</h4>
                                    <p>Quando existem vários alugueres no mesmo dia, aparecem vários chips e um resumo do excedente.</p>
                                </div>

                                <div className="meus-alugueres-navegacao">
                                    <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</button>
                                    <span>{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</span>
                                    <button type="button" onClick={() => mudarMes(1)} aria-label="Mês seguinte">›</button>
                                </div>
                            </div>

                            <div className="meus-alugueres-dias-semana">
                                {DIAS_SEMANA.map((dia) => (
                                    <span key={dia}>{dia}</span>
                                ))}
                            </div>

                            <div className="meus-alugueres-grelha">
                                {dias.map((dia) => {
                                    const itensDoDia = itensFiltrados.filter((item) => itemOcorreNoDia(item, dia.data));

                                    return (
                                        <div
                                            key={paraISO(dia.data)}
                                            className={`meus-alugueres-dia ${dia.pertenceAoMes ? '' : 'fora-mes'}`}
                                        >
                                            <strong>{dia.data.getDate()}</strong>

                                            <div className="meus-alugueres-dia-itens">
                                                {itensDoDia.slice(0, 3).map((item) => (
                                                    <button
                                                        key={getChaveItem(item)}
                                                        type="button"
                                                        className={`chip-meu-aluguer ${getEstadoClasse(item.estado)} ${getChaveItem(item) === getChaveItem(itemSelecionado ?? item) ? 'selecionado' : ''}`}
                                                        onClick={() => selecionarItem(item)}
                                                        title={item.artigo}
                                                    >
                                                        {item.artigo}
                                                    </button>
                                                ))}

                                                {itensDoDia.length > 3 ? (
                                                    <span className="chip-mais-alugueres">+{itensDoDia.length - 3} alugueres</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <LegendaEstados />
                        </section>
                    ) : (
                        <ListaMeusAlugueres
                            itens={itensFiltrados}
                            itemSelecionado={itemSelecionado}
                            onSelecionar={selecionarItem}
                        />
                    )}

                    <PainelDetalheMeuAluguer
                        item={itemSelecionado}
                        onVerAnuncio={onVerAnuncio}
                        onAceitarPedido={onAceitarPedido}
                        onRejeitarPedido={onRejeitarPedido}
                        onMarcarComoDevolvido={onMarcarComoDevolvido}
                        onConfirmarDevolucao={onConfirmarDevolucao}
                    />
                </div>
            ) : null}
        </div>
    );
}

function LegendaEstados() {
    const estados: EstadoMeuAluguer[] = [
        'pendente',
        'reservado',
        'ativo',
        'devolucao_pendente',
        'concluido',
        'cancelado',
    ];

    return (
        <div className="meus-alugueres-legenda">
            {estados.map((estado) => (
                <div key={estado} className={`legenda-meu-aluguer ${getEstadoClasse(estado)}`}>
                    <strong>{ESTADO_LABEL[estado]}</strong>
                </div>
            ))}
        </div>
    );
}

function ListaMeusAlugueres({
    itens,
    itemSelecionado,
    onSelecionar,
}: {
    itens: MeuAluguer[];
    itemSelecionado: MeuAluguer | null;
    onSelecionar: (item: MeuAluguer) => void;
}) {
    if (!itens.length) {
        return <div className="estado-vazio">Não existem alugueres para os filtros selecionados.</div>;
    }

    return (
        <section className="meus-alugueres-lista">
            {itens.map((item) => (
                <button
                    key={getChaveItem(item)}
                    type="button"
                    className={`meu-aluguer-linha ${itemSelecionado && getChaveItem(itemSelecionado) === getChaveItem(item) ? 'ativo' : ''}`}
                    onClick={() => onSelecionar(item)}
                >
                    <div>
                        <div className="linha-topo">
                            <span className={`badge-meu-aluguer ${getEstadoClasse(item.estado)}`}>{ESTADO_LABEL[item.estado] ?? item.estado}</span>
                            <span className="badge-outline">{PAPEL_LABEL[item.papel]}</span>
                            <span className="badge-outline">{item.tipoRegisto === 'pedido' ? 'Pedido' : 'Aluguer'}</span>
                        </div>
                        <strong>{item.artigo}</strong>
                        <p>{formatarData(item.inicio)} até {formatarData(item.fim)}</p>
                    </div>

                    <div className="meu-aluguer-outra-pessoa">
                        <span>Outra parte</span>
                        <strong>{item.outraPessoa || '--'}</strong>
                    </div>
                </button>
            ))}
        </section>
    );
}

function PainelDetalheMeuAluguer({
    item,
    onVerAnuncio,
    onAceitarPedido,
    onRejeitarPedido,
    onMarcarComoDevolvido,
    onConfirmarDevolucao,
}: {
    item: MeuAluguer | null;
    onVerAnuncio: (idAnuncio: number) => void;
    onAceitarPedido: (idPedido: number) => void;
    onRejeitarPedido: (idPedido: number) => void;
    onMarcarComoDevolvido: (idAluguer: number) => void;
    onConfirmarDevolucao: (idAluguer: number) => void;
}) {
    if (!item) {
        return (
            <aside className="meus-alugueres-detalhe">
                <p>Seleciona um aluguer para ver o detalhe.</p>
            </aside>
        );
    }

    return (
        <aside className="meus-alugueres-detalhe">
            <div className="detalhe-meu-aluguer-cabecalho">
                <div>
                    <span>Detalhe do aluguer</span>
                    <h4>{item.artigo}</h4>
                </div>
                <span className={`badge-meu-aluguer ${getEstadoClasse(item.estado)}`}>{ESTADO_LABEL[item.estado] ?? item.estado}</span>
            </div>

            <div className="detalhe-meu-aluguer-linhas">
                <div><span>Tipo</span><strong>{item.tipoRegisto === 'pedido' ? 'Pedido' : 'Aluguer'}</strong></div>
                <div><span>Papel</span><strong>{PAPEL_LABEL[item.papel]}</strong></div>
                <div><span>Categoria</span><strong>{item.categoria || '--'}</strong></div>
                <div><span>Início</span><strong>{formatarData(item.inicio)}</strong></div>
                <div><span>Fim previsto</span><strong>{formatarData(item.fim)}</strong></div>
                <div><span>{item.papel === 'dono' ? 'Pessoa' : 'Dono / origem'}</span><strong>{item.outraPessoa || '--'}</strong></div>
                {item.papel === 'dono' ? (
                    <div><span>Contacto</span><strong>{item.contactoOutraPessoa || '--'}</strong></div>
                ) : null}
                <div><span>Aluguer contínuo</span><strong>{item.aluguerContinuo ? 'Sim' : 'Não'}</strong></div>
            </div>

            <TrackingMeuAluguer estado={item.estado} tipoRegisto={item.tipoRegisto} />

            <div className="acoes-meu-aluguer">
                {item.podeAceitar && item.idPedido ? (
                    <ButtonComponent className="btn-principal" onClick={() => onAceitarPedido(item.idPedido!)}>Aceitar pedido</ButtonComponent>
                ) : null}

                {item.podeRejeitar && item.idPedido ? (
                    <ButtonComponent className="btn-perigo" onClick={() => onRejeitarPedido(item.idPedido!)}>Rejeitar pedido</ButtonComponent>
                ) : null}

                {item.podeMarcarComoDevolvido && item.idAluguer ? (
                    <ButtonComponent className="btn-principal" onClick={() => onMarcarComoDevolvido(item.idAluguer!)}>Marcar como devolvido</ButtonComponent>
                ) : null}

                {item.podeConfirmarDevolucao && item.idAluguer ? (
                    <ButtonComponent className="btn-principal" onClick={() => onConfirmarDevolucao(item.idAluguer!)}>Confirmar devolução</ButtonComponent>
                ) : null}

                {item.podeVerAnuncio !== false ? (
                    <ButtonComponent className="btn-secundario" onClick={() => onVerAnuncio(item.idAnuncio)}>Ver anúncio</ButtonComponent>
                ) : null}
            </div>
        </aside>
    );
}

function TrackingMeuAluguer({ estado, tipoRegisto }: { estado: EstadoMeuAluguer; tipoRegisto: 'pedido' | 'aluguer' }) {
    const passos = [
        {
            titulo: 'Proposta criada',
            texto: 'O pedido de aluguer foi registado.',
            done: true,
            active: tipoRegisto === 'pedido' && estado === 'pendente',
        },
        {
            titulo: 'Proposta aceite',
            texto: 'O dono confirmou o pedido.',
            done: ['reservado', 'ativo', 'devolucao_pendente', 'concluido'].includes(estado),
            active: estado === 'reservado',
        },
        {
            titulo: 'Aluguer em curso',
            texto: 'O artigo está no período de utilização.',
            done: ['ativo', 'devolucao_pendente', 'concluido'].includes(estado),
            active: estado === 'ativo',
        },
        {
            titulo: 'Devolução',
            texto: 'A devolução foi marcada ou está por confirmar.',
            done: ['devolucao_pendente', 'concluido'].includes(estado),
            active: estado === 'devolucao_pendente',
        },
        {
            titulo: 'Concluído',
            texto: 'O dono confirmou a devolução.',
            done: estado === 'concluido',
            active: false,
        },
    ];

    return (
        <div className="tracking-meu-aluguer">
            <h4>Tracking</h4>
            {passos.map((passo) => (
                <div
                    key={passo.titulo}
                    className={`tracking-meu-item ${passo.done ? 'done' : ''} ${passo.active ? 'active' : ''}`}
                >
                    <span />
                    <div>
                        <strong>{passo.titulo}</strong>
                        <p>{passo.texto}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
