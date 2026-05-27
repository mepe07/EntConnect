import React, { useEffect, useMemo, useState } from 'react';
import { ButtonComponent } from '~/components/button/button.component';
import { showToast } from '~/components/toast/toast';
import {
    type Anuncio,
    type CalendarioAnuncioItem,
    type CriarPedidoAluguerPayload,
    EstadoAnuncio,
} from '../../../types/marketplace.types';

interface AnuncioDisponibilidadeProps {
    anuncio: Anuncio;
    calendario: CalendarioAnuncioItem[];
    loading: boolean;
    erro: string;
    isDono: boolean;
    onCriarPedido: (payload: CriarPedidoAluguerPayload) => Promise<void>;
    onConfirmarDevolucao: (idAluguer: number) => Promise<void>;
}

type EstadoDiaCalendario =
    | 'disponivel'
    | 'ocupado'
    | 'reservado'
    | 'alugado'
    | 'devolucao_pendente'
    | 'selecionado'
    | 'indisponivel';

interface DiaCalendario {
    data: Date;
    chave: string;
    numero: number;
    mesAtual: boolean;
}

function normalizarData(data: Date) {
    const normalizada = new Date(data);
    normalizada.setHours(0, 0, 0, 0);
    return normalizada;
}

function parseDataApi(valor: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split('-').map(Number);
        return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    }

    return normalizarData(new Date(valor));
}

function formatarDataApi(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataCurta(data?: Date | null) {
    if (!data) return '--';
    return data.toLocaleDateString('pt-PT');
}

function formatarEstadoDetalhe(estado: CalendarioAnuncioItem['estado']) {
    if (estado === 'devolucao_pendente') return 'Devolução pendente';
    if (estado === 'reservado') return 'Reservado';
    if (estado === 'alugado') return 'Alugado';
    return 'Ocupado';
}


function obterLabelEstadoDia(estado: EstadoDiaCalendario) {
    switch (estado) {
        case 'selecionado':
            return 'Selecionado';
        case 'disponivel':
            return 'Disponível';
        case 'ocupado':
            return 'Ocupado';
        case 'reservado':
            return 'Reservado';
        case 'alugado':
            return 'Alugado';
        case 'devolucao_pendente':
            return 'Devolução';
        case 'indisponivel':
            return 'Indisponível';
        default:
            return 'Indisponível';
    }
}

function obterInicioDaGrelha(mesVisivel: Date) {
    const primeiroDia = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1);
    const diaSemana = primeiroDia.getDay();
    const deslocamento = diaSemana === 0 ? 6 : diaSemana - 1;
    primeiroDia.setDate(primeiroDia.getDate() - deslocamento);
    return normalizarData(primeiroDia);
}

function criarDiasCalendario(mesVisivel: Date): DiaCalendario[] {
    const inicio = obterInicioDaGrelha(mesVisivel);

    return Array.from({ length: 42 }, (_, indice) => {
        const data = new Date(inicio);
        data.setDate(inicio.getDate() + indice);

        return {
            data,
            chave: formatarDataApi(data),
            numero: data.getDate(),
            mesAtual: data.getMonth() === mesVisivel.getMonth(),
        };
    });
}

function datasIguais(dataA?: Date | null, dataB?: Date | null) {
    if (!dataA || !dataB) return false;
    return normalizarData(dataA).getTime() === normalizarData(dataB).getTime();
}

function dataDentroDoIntervalo(data: Date, inicio: Date, fim: Date) {
    const alvo = normalizarData(data).getTime();
    const inicioNormalizado = normalizarData(inicio).getTime();
    const fimNormalizado = normalizarData(fim).getTime();

    return alvo >= inicioNormalizado && alvo <= fimNormalizado;
}

function ordenarIntervalo(dataA: Date, dataB: Date) {
    return normalizarData(dataA).getTime() <= normalizarData(dataB).getTime()
        ? [normalizarData(dataA), normalizarData(dataB)]
        : [normalizarData(dataB), normalizarData(dataA)];
}

function obterItemDoDia(calendario: CalendarioAnuncioItem[], data: Date) {
    return calendario.find((item) => {
        const inicio = parseDataApi(item.dataInicio);
        const fim = parseDataApi(item.dataFim);
        return dataDentroDoIntervalo(data, inicio, fim);
    }) ?? null;
}

function intervaloSelecionadoTemConflito(
    calendario: CalendarioAnuncioItem[],
    inicio: Date,
    fim: Date,
) {
    const cursor = new Date(inicio);
    const fimNormalizado = normalizarData(fim).getTime();

    while (normalizarData(cursor).getTime() <= fimNormalizado) {
        if (obterItemDoDia(calendario, cursor)) {
            return true;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return false;
}

export function AnuncioDisponibilidade({
    anuncio,
    calendario,
    loading,
    erro,
    isDono,
    onCriarPedido,
    onConfirmarDevolucao,
}: AnuncioDisponibilidadeProps) {
    const [mesVisivel, setMesVisivel] = useState(() => normalizarData(new Date()));
    const [dataInicioSelecionada, setDataInicioSelecionada] = useState<Date | null>(null);
    const [dataFimSelecionada, setDataFimSelecionada] = useState<Date | null>(null);
    const [dataAtiva, setDataAtiva] = useState<Date | null>(null);
    const [mensagemPedido, setMensagemPedido] = useState('');
    const [aSubmeterPedido, setASubmeterPedido] = useState(false);
    const [aConfirmarDevolucao, setAConfirmarDevolucao] = useState(false);

    const podeCriarPedido = !isDono && anuncio.Estado_Anuncio === EstadoAnuncio.ATIVO;

    useEffect(() => {
        setMesVisivel(normalizarData(new Date()));
        setDataInicioSelecionada(null);
        setDataFimSelecionada(null);
        setDataAtiva(null);
        setMensagemPedido('');
    }, [anuncio.ID_Artigo]);

    const diasCalendario = useMemo(() => criarDiasCalendario(mesVisivel), [mesVisivel]);
    const itemSelecionado = useMemo(
        () => (dataAtiva ? obterItemDoDia(calendario, dataAtiva) : null),
        [calendario, dataAtiva],
    );

    const resumoSelecao = useMemo(() => {
        if (!dataInicioSelecionada) {
            return 'Seleciona uma data disponível para começar.';
        }

        if (!dataFimSelecionada) {
            return `Início escolhido: ${formatarDataCurta(dataInicioSelecionada)}. Seleciona a data final.`;
        }

        return `Intervalo: ${formatarDataCurta(dataInicioSelecionada)} até ${formatarDataCurta(dataFimSelecionada)}.`;
    }, [dataFimSelecionada, dataInicioSelecionada]);

    const estadoDoDia = (dia: DiaCalendario): EstadoDiaCalendario => {
        if (!dia.mesAtual) {
            return 'indisponivel';
        }

        const item = obterItemDoDia(calendario, dia.data);
        if (item) {
            if (!isDono) return 'ocupado';
            return item.estado;
        }

        if (
            podeCriarPedido &&
            dataInicioSelecionada &&
            dataFimSelecionada &&
            dataDentroDoIntervalo(dia.data, dataInicioSelecionada, dataFimSelecionada)
        ) {
            return 'selecionado';
        }

        if (
            podeCriarPedido &&
            dataInicioSelecionada &&
            !dataFimSelecionada &&
            datasIguais(dia.data, dataInicioSelecionada)
        ) {
            return 'selecionado';
        }

        return 'disponivel';
    };

    const handleSelecionarDia = (dia: DiaCalendario) => {
        if (!dia.mesAtual) {
            return;
        }

        setDataAtiva(dia.data);
        const item = obterItemDoDia(calendario, dia.data);

        if (item || !podeCriarPedido) {
            return;
        }

        if (!dataInicioSelecionada || (dataInicioSelecionada && dataFimSelecionada)) {
            setDataInicioSelecionada(dia.data);
            setDataFimSelecionada(null);
            return;
        }

        const [inicio, fim] = ordenarIntervalo(dataInicioSelecionada, dia.data);

        if (intervaloSelecionadoTemConflito(calendario, inicio, fim)) {
            showToast('O intervalo selecionado inclui datas ocupadas.');
            setDataInicioSelecionada(dia.data);
            setDataFimSelecionada(null);
            return;
        }

        setDataInicioSelecionada(inicio);
        setDataFimSelecionada(fim);
    };

    const limparSelecao = () => {
        setDataInicioSelecionada(null);
        setDataFimSelecionada(null);
        setMensagemPedido('');
    };

    const submeterPedido = async () => {
        if (!podeCriarPedido || !dataInicioSelecionada || !dataFimSelecionada) {
            showToast('Seleciona um intervalo válido antes de submeter o pedido.');
            return;
        }

        if (intervaloSelecionadoTemConflito(calendario, dataInicioSelecionada, dataFimSelecionada)) {
            showToast('O intervalo selecionado já não está disponível.');
            return;
        }

        setASubmeterPedido(true);

        try {
            await onCriarPedido({
                dataInicio: formatarDataApi(dataInicioSelecionada),
                dataFim: formatarDataApi(dataFimSelecionada),
                mensagem: mensagemPedido.trim() || undefined,
            });
            limparSelecao();
        } finally {
            setASubmeterPedido(false);
        }
    };

    const confirmarDevolucao = async () => {
        if (!itemSelecionado?.idAluguer || !isDono) return;

        setAConfirmarDevolucao(true);
        try {
            await onConfirmarDevolucao(itemSelecionado.idAluguer);
            setDataAtiva(null);
        } finally {
            setAConfirmarDevolucao(false);
        }
    };

    const detalhePublico = itemSelecionado
        ? {
              titulo: 'Ocupado',
              descricao: 'Este artigo encontra-se indisponível para pedido nesta data.',
          }
        : {
              titulo: 'Disponível',
              descricao: 'Esta data está livre e pode ser usada para criar uma proposta de aluguer.',
          };

    const passosTracking = itemSelecionado
        ? [
              {
                  titulo: 'Proposta aceite',
                  estado: 'done',
                  descricao: itemSelecionado.nomePessoa
                      ? `Pedido de ${itemSelecionado.nomePessoa} aprovado pelo dono.`
                      : 'Pedido aprovado pelo dono.',
              },
              {
                  titulo: 'Empréstimo iniciado',
                  estado: itemSelecionado.estado === 'reservado' ? 'pending' : 'done',
                  descricao:
                      itemSelecionado.estado === 'reservado'
                          ? 'A aguardar data de início.'
                          : 'Artigo entregue e empréstimo iniciado.',
              },
              {
                  titulo: 'Em curso',
                  estado:
                      itemSelecionado.estado === 'alugado'
                          ? 'active'
                          : itemSelecionado.estado === 'devolucao_pendente'
                              ? 'done'
                              : 'pending',
                  descricao: `Período previsto: ${formatarDataCurta(parseDataApi(itemSelecionado.dataInicio))} até ${formatarDataCurta(parseDataApi(itemSelecionado.dataFim))}.`,
              },
              {
                  titulo: 'Devolução',
                  estado: itemSelecionado.estado === 'devolucao_pendente' ? 'active' : 'pending',
                  descricao:
                      itemSelecionado.estado === 'devolucao_pendente'
                          ? 'A aguardar confirmação do dono.'
                          : 'Ainda sem devolução registada.',
              },
          ]
        : [];

    return (
        <div className="disponibilidade-tab">
            <div className="detalhe-subcabecalho">
                <h3>Disponibilidade</h3>
                <p>
                    {isDono
                        ? 'O dono vê reservas, alugueres e detalhe do empréstimo.'
                        : 'Consulta a disponibilidade e escolhe um intervalo livre para pedir aluguer.'}
                </p>
            </div>

            {loading ? <div className="estado-vazio disponibilidade-estado">A carregar disponibilidade...</div> : null}
            {!loading && erro ? <div className="mensagem-erro disponibilidade-estado">{erro}</div> : null}

            {!loading && !erro ? (
                <div className="disponibilidade-conteudo">
                    <div className="disponibilidade-calendario">
                        <div className="cabecalho-calendario">
                            <div>
                                <h4>Calendário de disponibilidade</h4>
                                <p>
                                    {isDono
                                        ? 'Seleciona um período ocupado para ver o detalhe do empréstimo.'
                                        : 'Seleciona datas disponíveis para criar uma proposta de aluguer.'}
                                </p>
                            </div>
                            <div className="navegacao-mes">
                                <button
                                    type="button"
                                    className="botao-mes"
                                    onClick={() =>
                                        setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() - 1, 1))
                                    }
                                >
                                    ‹
                                </button>
                                <div className="etiqueta-mes">
                                    {mesVisivel.toLocaleDateString('pt-PT', {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </div>
                                <button
                                    type="button"
                                    className="botao-mes"
                                    onClick={() =>
                                        setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() + 1, 1))
                                    }
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        <div className="grelha-calendario">
                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((diaSemana) => (
                                <div key={diaSemana} className="cabecalho-dia">
                                    {diaSemana}
                                </div>
                            ))}

                            {diasCalendario.map((dia) => {
                                const estado = estadoDoDia(dia);
                                const item = obterItemDoDia(calendario, dia.data);

                                return (
                                    <button
                                        type="button"
                                        key={dia.chave}
                                        className={`dia-calendario ${dia.mesAtual ? 'clicavel' : ''} estado-${estado} ${datasIguais(dataAtiva, dia.data) ? 'dia-ativo' : ''}`}
                                        onClick={() => handleSelecionarDia(dia)}
                                    >
                                        <span className="dia-numero">{dia.numero}</span>
                                        <span className="dia-estado-texto">{obterLabelEstadoDia(estado)}</span>
                                        {!isDono && item ? <span className="dia-marcador-publico" /> : null}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="legenda-calendario">
                            <div className="legenda-item estado-disponivel">
                                <strong>Disponível</strong>
                                <span>Pode receber pedidos.</span>
                            </div>
                            {isDono ? (
                                <>
                                    <div className="legenda-item estado-reservado">
                                        <strong>Reservado</strong>
                                        <span>Pedido aceite para data futura.</span>
                                    </div>
                                    <div className="legenda-item estado-alugado">
                                        <strong>Alugado</strong>
                                        <span>Aluguer em curso.</span>
                                    </div>
                                    <div className="legenda-item estado-devolucao_pendente">
                                        <strong>Devolução</strong>
                                        <span>A aguardar confirmação do dono.</span>
                                    </div>
                                </>
                            ) : (
                                <div className="legenda-item estado-ocupado">
                                    <strong>Ocupado</strong>
                                    <span>Datas indisponíveis para pedido.</span>
                                </div>
                            )}
                            <div className="legenda-item estado-indisponivel">
                                <strong>Indisponível</strong>
                                <span>Dias fora do mês visível.</span>
                            </div>
                        </div>
                    </div>

                    <div className="disponibilidade-lateral">
                        {podeCriarPedido ? (
                            <div className="painel-disponibilidade pedido-aluguer-box">
                                <h4>Pedir aluguer</h4>
                                <p>{resumoSelecao}</p>
                                <textarea
                                    value={mensagemPedido}
                                    onChange={(evento) => setMensagemPedido(evento.target.value)}
                                    placeholder="Mensagem opcional para acompanhar a proposta."
                                />
                                <div className="pedido-resumo">
                                    <span>Início: <strong>{formatarDataCurta(dataInicioSelecionada)}</strong></span>
                                    <span>Fim: <strong>{formatarDataCurta(dataFimSelecionada)}</strong></span>
                                </div>
                                <div className="pedido-acoes">
                                    <ButtonComponent
                                        className="btn-principal"
                                        onClick={submeterPedido}
                                        disabled={!dataInicioSelecionada || !dataFimSelecionada || aSubmeterPedido}
                                    >
                                        {aSubmeterPedido ? 'A submeter...' : 'Submeter proposta'}
                                    </ButtonComponent>
                                    <ButtonComponent className="btn-secundario" onClick={limparSelecao}>
                                        Limpar seleção
                                    </ButtonComponent>
                                </div>
                            </div>
                        ) : (
                            <div className="painel-disponibilidade detalhe-dia-box">
                                <h4>Disponibilidade do dia</h4>
                                <p className="estado-dia-titulo">{detalhePublico.titulo}</p>
                                <p>{detalhePublico.descricao}</p>
                            </div>
                        )}

                        {!isDono ? (
                            <div className="painel-disponibilidade detalhe-dia-box">
                                <h4>Detalhe do dia</h4>
                                <p className="estado-dia-titulo">{detalhePublico.titulo}</p>
                                <p>{detalhePublico.descricao}</p>
                            </div>
                        ) : itemSelecionado ? (
                            <div className="detalhe-emprestimo-grid">
                                <div className="painel-disponibilidade detalhe-emprestimo-box">
                                    <h4>Detalhe do empréstimo</h4>
                                    <div className="linhas-info detalhe-emprestimo-linhas">
                                        <div><span>Estado</span><strong>{formatarEstadoDetalhe(itemSelecionado.estado)}</strong></div>
                                        <div><span>Pessoa</span><strong>{itemSelecionado.nomePessoa || '--'}</strong></div>
                                        <div><span>Contacto</span><strong>{itemSelecionado.contacto || '--'}</strong></div>
                                        <div><span>Data de início</span><strong>{formatarDataCurta(parseDataApi(itemSelecionado.dataInicio))}</strong></div>
                                        <div><span>Data prevista de devolução</span><strong>{formatarDataCurta(parseDataApi(itemSelecionado.dataFim))}</strong></div>
                                    </div>
                                    {itemSelecionado.idAluguer && (
                                        <ButtonComponent
                                            className="btn-principal"
                                            onClick={confirmarDevolucao}
                                            disabled={
                                                aConfirmarDevolucao ||
                                                !['alugado', 'devolucao_pendente'].includes(itemSelecionado.estado)
                                            }
                                        >
                                            {aConfirmarDevolucao ? 'A confirmar...' : 'Confirmar devolução'}
                                        </ButtonComponent>
                                    )}
                                </div>

                                <div className="painel-disponibilidade tracking-emprestimo-box">
                                    <h4>Tracking do empréstimo</h4>
                                    <div className="tracking-lista">
                                        {passosTracking.map((passo) => (
                                            <div key={passo.titulo} className={`tracking-item tracking-${passo.estado}`}>
                                                <div className="tracking-bullet" />
                                                <div>
                                                    <strong>{passo.titulo}</strong>
                                                    <p>{passo.descricao}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="painel-disponibilidade detalhe-dia-box">
                                <h4>Detalhe do empréstimo</h4>
                                <p>Seleciona um período ocupado para veres o detalhe do empréstimo e o tracking.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
