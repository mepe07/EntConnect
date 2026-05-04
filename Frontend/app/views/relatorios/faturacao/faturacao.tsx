
import './faturacao.scss';

import { useState, useMemo, useEffect } from 'react';
import type { LinhaFaturacaoCoaching, FiltroFaturacao } from '../../../models/interfaces/faturacao.interface';
import { TableComponent } from '../../../components/table/table.component';
import { TableColumnTypesEnum } from '../../../components/table/models/enums/table-column-types.enum';
import { ButtonComponent } from '../../../components/button/button.component';

import { InputComponent } from '../../../components/input/input.component';
import { faturacaoService } from "../../../services/faturacao.service";

const obterDataAtualInput = () => {
    return formatarDataInput(new Date());
};

const formatarDataInput = (data: Date) => {
    const dataLocal = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const offsetTimezone = dataLocal.getTimezoneOffset() * 60000;

    return new Date(dataLocal.getTime() - offsetTimezone).toISOString().split('T')[0];
};

const obterPeriodoHoje = (): FiltroFaturacao => {
    const hoje = obterDataAtualInput();

    return { dataInicio: hoje, dataFim: hoje };
};

const obterPeriodoSemanaAtual = (): FiltroFaturacao => {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const diferencaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diferencaSegunda);

    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);

    return {
        dataInicio: formatarDataInput(segunda),
        dataFim: formatarDataInput(domingo),
    };
};

const obterPeriodoMesAtual = (): FiltroFaturacao => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
        dataInicio: formatarDataInput(primeiroDia),
        dataFim: formatarDataInput(ultimoDia),
    };
};

type CelulaXlsx = {
    valor: string | number;
    tipo?: 'string' | 'number';
    estilo?: number;
};

const escaparXml = (valor: unknown) => String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const obterNomeColuna = (indice: number) => {
    let nome = '';
    let numero = indice + 1;

    while (numero > 0) {
        const resto = (numero - 1) % 26;
        nome = String.fromCharCode(65 + resto) + nome;
        numero = Math.floor((numero - 1) / 26);
    }

    return nome;
};

const criarTabelaCrc32 = () => {
    const tabela: number[] = [];

    for (let i = 0; i < 256; i++) {
        let valor = i;

        for (let j = 0; j < 8; j++) {
            valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
        }

        tabela[i] = valor >>> 0;
    }

    return tabela;
};

const tabelaCrc32 = criarTabelaCrc32();

const calcularCrc32 = (dados: Uint8Array) => {
    let crc = 0xffffffff;

    for (const byte of dados) {
        crc = tabelaCrc32[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
};

const concatenarBytes = (partes: Uint8Array[]) => {
    const tamanho = partes.reduce((total, parte) => total + parte.length, 0);
    const resultado = new Uint8Array(tamanho);
    let offset = 0;

    partes.forEach(parte => {
        resultado.set(parte, offset);
        offset += parte.length;
    });

    return resultado;
};

const bytesCabecalhoZip = (valores: number[]) => new Uint8Array(valores);

const escreverUint16 = (valor: number) => [valor & 0xff, (valor >>> 8) & 0xff];

const escreverUint32 = (valor: number) => [
    valor & 0xff,
    (valor >>> 8) & 0xff,
    (valor >>> 16) & 0xff,
    (valor >>> 24) & 0xff,
];

const obterDataZip = () => {
    const agora = new Date();
    const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2);
    const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();

    return { hora, data };
};

const criarZip = (ficheiros: { nome: string; conteudo: string }[]) => {
    const encoder = new TextEncoder();
    const partesLocais: Uint8Array[] = [];
    const partesCentrais: Uint8Array[] = [];
    const { hora, data } = obterDataZip();
    let offset = 0;

    ficheiros.forEach(ficheiro => {
        const nome = encoder.encode(ficheiro.nome);
        const conteudo = encoder.encode(ficheiro.conteudo);
        const crc = calcularCrc32(conteudo);

        const local = concatenarBytes([
            bytesCabecalhoZip([
                ...escreverUint32(0x04034b50),
                ...escreverUint16(20),
                ...escreverUint16(0),
                ...escreverUint16(0),
                ...escreverUint16(hora),
                ...escreverUint16(data),
                ...escreverUint32(crc),
                ...escreverUint32(conteudo.length),
                ...escreverUint32(conteudo.length),
                ...escreverUint16(nome.length),
                ...escreverUint16(0),
            ]),
            nome,
            conteudo,
        ]);

        const central = concatenarBytes([
            bytesCabecalhoZip([
                ...escreverUint32(0x02014b50),
                ...escreverUint16(20),
                ...escreverUint16(20),
                ...escreverUint16(0),
                ...escreverUint16(0),
                ...escreverUint16(hora),
                ...escreverUint16(data),
                ...escreverUint32(crc),
                ...escreverUint32(conteudo.length),
                ...escreverUint32(conteudo.length),
                ...escreverUint16(nome.length),
                ...escreverUint16(0),
                ...escreverUint16(0),
                ...escreverUint16(0),
                ...escreverUint16(0),
                ...escreverUint32(0),
                ...escreverUint32(offset),
            ]),
            nome,
        ]);

        partesLocais.push(local);
        partesCentrais.push(central);
        offset += local.length;
    });

    const diretorioCentral = concatenarBytes(partesCentrais);
    const fim = bytesCabecalhoZip([
        ...escreverUint32(0x06054b50),
        ...escreverUint16(0),
        ...escreverUint16(0),
        ...escreverUint16(ficheiros.length),
        ...escreverUint16(ficheiros.length),
        ...escreverUint32(diretorioCentral.length),
        ...escreverUint32(offset),
        ...escreverUint16(0),
    ]);

    return concatenarBytes([...partesLocais, diretorioCentral, fim]);
};

const criarXlsx = (linhas: CelulaXlsx[][]) => {
    const ultimaLinha = linhas.length;
    const ultimaColuna = Math.max(...linhas.map(linha => linha.length));
    const dimensao = `A1:${obterNomeColuna(ultimaColuna - 1)}${ultimaLinha}`;

    const linhasXml = linhas.map((linha, linhaIndex) => {
        const numeroLinha = linhaIndex + 1;
        const celulas = linha.map((celula, colunaIndex) => {
            const ref = `${obterNomeColuna(colunaIndex)}${numeroLinha}`;
            const estilo = celula.estilo !== undefined ? ` s="${celula.estilo}"` : '';

            if (celula.tipo === 'number') {
                return `<c r="${ref}"${estilo}><v>${Number(celula.valor).toString()}</v></c>`;
            }

            return `<c r="${ref}" t="inlineStr"${estilo}><is><t>${escaparXml(celula.valor)}</t></is></c>`;
        }).join('');

        return `<row r="${numeroLinha}">${celulas}</row>`;
    }).join('');

    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <dimension ref="${dimensao}"/>
    <cols>
        <col min="1" max="1" width="24" customWidth="1"/>
        <col min="2" max="2" width="30" customWidth="1"/>
        <col min="3" max="6" width="24" customWidth="1"/>
        <col min="7" max="8" width="18" customWidth="1"/>
        <col min="9" max="11" width="14" customWidth="1"/>
        <col min="12" max="12" width="20" customWidth="1"/>
    </cols>
    <sheetData>${linhasXml}</sheetData>
</worksheet>`;

    const ficheiros = [
        {
            nome: '[Content_Types].xml',
            conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
        },
        {
            nome: '_rels/.rels',
            conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
        },
        {
            nome: 'xl/workbook.xml',
            conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets><sheet name="Faturacao" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
        },
        {
            nome: 'xl/_rels/workbook.xml.rels',
            conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
        },
        {
            nome: 'xl/styles.xml',
            conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="3">
        <font><sz val="11"/><name val="Calibri"/></font>
        <font><b/><sz val="14"/><name val="Calibri"/></font>
        <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
    </fonts>
    <fills count="4">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
    </fills>
    <borders count="2">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
    </borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="5">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1"/>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1"/>
        <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1"/>
        <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    </cellXfs>
</styleSheet>`,
        },
        {
            nome: 'xl/worksheets/sheet1.xml',
            conteudo: worksheet,
        },
    ];

    return criarZip(ficheiros);
};

export function Faturacao() {


    const [filtro, setFiltro] = useState<FiltroFaturacao>({ dataInicio: '', dataFim: obterDataAtualInput() });
    const [periodoPesquisado, setPeriodoPesquisado] = useState<FiltroFaturacao>({ dataInicio: '', dataFim: '' });
    const [faturas, setFaturas] = useState<LinhaFaturacaoCoaching[]>([]);
    const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
    const [professorSelecionado, setProfessorSelecionado] = useState<string | null>(null);
    const [aCarregar, setACarregar] = useState(false);


    const [pesquisaProf, setPesquisaProf] = useState('');

    const filtrosRapidos = [
        {
            label: 'Hoje',
            icon: 'fa-solid fa-calendar-day',
            aplicar: () => aplicarFiltroRapido(obterPeriodoHoje()),
        },
        {
            label: 'Esta semana',
            icon: 'fa-solid fa-calendar-week',
            aplicar: () => aplicarFiltroRapido(obterPeriodoSemanaAtual()),
        },
        {
            label: 'Mês atual',
            icon: 'fa-solid fa-calendar-days',
            aplicar: () => aplicarFiltroRapido(obterPeriodoMesAtual()),
        },
    ];


    useEffect(() => {
        if (professorSelecionado) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [professorSelecionado]);


    const handlePesquisa = async (periodo: FiltroFaturacao = filtro) => {
        if (!periodo.dataInicio || !periodo.dataFim) return alert('Por favor, selecione ambas as datas para realizar a pesquisa.');

        setACarregar(true);

        try {
            const dados = await faturacaoService.getRelatorio(periodo.dataInicio, periodo.dataFim);

            setFaturas(dados);
            setPesquisaRealizada(true);
            setPeriodoPesquisado({ ...periodo });
            setProfessorSelecionado(null);
        } catch (error) {
            console.error('Erro ao buscar dados de faturação:', error);
            alert('Ocorreu um erro ao buscar os dados de faturação. Por favor, tente novamente mais tarde.');
        } finally {
            setACarregar(false);
        }
    };

    const aplicarFiltroRapido = (periodo: FiltroFaturacao) => {
        setFiltro(periodo);
        handlePesquisa(periodo);
    };


    const resumoProfessores = useMemo(() => {
        const resumo: Record<string, any> = {};
        faturas.forEach(f => {
            if (!resumo[f.nomeProfessor]) {
                resumo[f.nomeProfessor] = { nome: f.nomeProfessor, foto: f.fotoProfessorUrl, totalAulas: 0, totalDinheiro: 0 };
            }
            resumo[f.nomeProfessor].totalAulas++;
            resumo[f.nomeProfessor].totalDinheiro += f.valorTotal;
        });
        return Object.values(resumo).sort((a, b) => b.totalDinheiro - a.totalDinheiro);
    }, [faturas]);


    const professoresFiltrados = resumoProfessores.filter(p =>
        p.nome.toLowerCase().includes(pesquisaProf.toLowerCase())
    );


    const profFocado = resumoProfessores.find(p => p.nome === professorSelecionado);

    const formatarData = (valor?: string | null) => {
        if (!valor) return '';

        return new Date(valor).toLocaleDateString('pt-PT');
    };

    const formatarMoeda = (valor?: number | null) => Number(valor ?? 0).toFixed(2);

    const obterEstadoPagamento = (fatura: LinhaFaturacaoCoaching) => {
        if (fatura.estaPago) return 'Pago';
        if (fatura.estadoPagamento === 'atrasado') return 'Atrasado';

        return 'Pendente';
    };

    const exportarFaturacao = () => {
        if (!pesquisaRealizada || faturas.length === 0) {
            alert('Nao existem dados para exportar neste periodo.');
            return;
        }

        const faturasOrdenadas = [...faturas].sort((a, b) =>
            a.nomeProfessor.localeCompare(b.nomeProfessor, 'pt-PT') ||
            new Date(a.dataAula).getTime() - new Date(b.dataAula).getTime() ||
            a.nomeAluno.localeCompare(b.nomeAluno, 'pt-PT')
        );

        const totalFaturado = faturas.reduce((total, f) => total + Number(f.valorTotal ?? 0), 0);
        const totalPago = faturas.reduce((total, f) => {
            const valorTotal = Number(f.valorTotal ?? 0);
            return total + Number(f.valorPago ?? Math.max(valorTotal - Number(f.valorEmFalta ?? 0), 0));
        }, 0);
        const totalDivida = faturas.reduce((total, f) => total + Number(f.valorEmFalta ?? 0), 0);

        const linhasXlsx: CelulaXlsx[][] = [
            [{ valor: 'Relatorio de Faturacao de Coaching', estilo: 1 }],
            [
                { valor: 'Periodo', estilo: 2 },
                { valor: `${formatarData(periodoPesquisado.dataInicio)} a ${formatarData(periodoPesquisado.dataFim)}` },
            ],
            [
                { valor: 'Total de registos', estilo: 2 },
                { valor: faturas.length, tipo: 'number' },
                { valor: 'Total faturado', estilo: 2 },
                { valor: totalFaturado, tipo: 'number', estilo: 4 },
                { valor: 'Total pago', estilo: 2 },
                { valor: totalPago, tipo: 'number', estilo: 4 },
                { valor: 'Total em divida', estilo: 2 },
                { valor: totalDivida, tipo: 'number', estilo: 4 },
            ],
            [],
            [
                { valor: 'Professor', estilo: 3 },
                { valor: 'Email professor', estilo: 3 },
                { valor: 'Aluno', estilo: 3 },
                { valor: 'Encarregado de educacao', estilo: 3 },
                { valor: 'Email encarregado', estilo: 3 },
                { valor: 'Contacto encarregado', estilo: 3 },
                { valor: 'Data do coaching', estilo: 3 },
                { valor: 'Sala', estilo: 3 },
                { valor: 'Valor total', estilo: 3 },
                { valor: 'Valor pago', estilo: 3 },
                { valor: 'Valor em divida', estilo: 3 },
                { valor: 'Estado de pagamento', estilo: 3 },
            ],
            ...faturasOrdenadas.map(f => {
                const valorTotal = Number(f.valorTotal ?? 0);
                const valorPago = Number(f.valorPago ?? Math.max(valorTotal - Number(f.valorEmFalta ?? 0), 0));
                const valorEmFalta = Number(f.valorEmFalta ?? Math.max(valorTotal - valorPago, 0));

                return [
                    { valor: f.nomeProfessor },
                    { valor: f.emailProfessor ?? '' },
                    { valor: f.nomeAluno },
                    { valor: f.nomeEncarregado ?? '' },
                    { valor: f.emailEncarregado ?? '' },
                    { valor: f.contactoEncarregado ?? '' },
                    { valor: formatarData(f.dataAula) },
                    { valor: f.salaNome ?? '' },
                    { valor: valorTotal, tipo: 'number', estilo: 4 },
                    { valor: valorPago, tipo: 'number', estilo: 4 },
                    { valor: valorEmFalta, tipo: 'number', estilo: 4 },
                    { valor: obterEstadoPagamento(f) },
                ] satisfies CelulaXlsx[];
            }),
        ];

        const ficheiroXlsx = criarXlsx(linhasXlsx);
        const blob = new Blob([ficheiroXlsx], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `faturacao_${periodoPesquisado.dataInicio}_${periodoPesquisado.dataFim}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const tableData = faturas
        .filter(f => f.nomeProfessor === professorSelecionado)
        .map(f => {
            const dataFormatada = new Date(f.dataAula).toLocaleDateString('pt-PT');
            const valorTotal = Number(f.valorTotal ?? 0);
            const valorPago = Number(f.valorPago ?? Math.max(valorTotal - Number(f.valorEmFalta ?? 0), 0));
            const valorEmFalta = Number(f.valorEmFalta ?? Math.max(valorTotal - valorPago, 0));

            return {
                ...f,
                dataAula: dataFormatada,
                valorPago,
                valorEmFalta,
                estadoTabela: {
                    value: obterEstadoPagamento(f),
                    infoType: f.estaPago ? 'success' : 'error'
                }
            };
        });


    return (
        <div className="pagina-faturacao">
            <div className="cabecalho-pagina">
            <h1>Report de Faturação</h1>

                {pesquisaRealizada && (
                    <ButtonComponent
                        label="Exportar"
                        disabled={aCarregar || faturas.length === 0}
                        onClick={exportarFaturacao}
                        icon="fa-solid fa-file-excel"
                    />
                )}
            </div>

            <div className="filtros-iniciais">
                <div className="pesquisa-periodo">
                <div className="grupo-data">
                    <label>Data Início</label>
                    <input type="date" value={filtro.dataInicio} onChange={e => setFiltro({ ...filtro, dataInicio: e.target.value })} />
                </div>
                <div className="grupo-data">
                    <label>Data Final</label>
                    <input type="date" value={filtro.dataFim} onChange={e => setFiltro({ ...filtro, dataFim: e.target.value })} />
                </div>
                <ButtonComponent
                    label={aCarregar ? "A carregar..." : "Pesquisar"}
                    disabled={aCarregar}
                    onClick={() => handlePesquisa()}
                    icon="fa-solid fa-magnifying-glass"
                />
                </div>
                <div className="filtros-rapidos" aria-label="Filtros rápidos de data">
                    {filtrosRapidos.map(filtroRapido => (
                        <ButtonComponent
                            key={filtroRapido.label}
                            label={filtroRapido.label}
                            onClick={filtroRapido.aplicar}
                            icon={filtroRapido.icon}
                            disabled={aCarregar}
                        />
                    ))}
                </div>
            </div>

            {pesquisaRealizada && (
                <div className="layout-master-detail">

                    <div className="painel-esquerdo">
                        <h3><i className="fa-solid fa-users"></i> Resumo por Professor</h3>


                        <div style={{ marginBottom: '15px' }}>
                            <InputComponent
                                id="pesquisa-prof"
                                placeholder="🔍 Procurar professor..."
                                value={pesquisaProf}
                                onChange={(e) => setPesquisaProf(e.target.value)}
                            />
                        </div>

                        <div className="lista-cards">

                            {professoresFiltrados.map(p => (
                                <div key={p.nome} className={`card-resumo ${professorSelecionado === p.nome ? 'ativo' : ''}`} onClick={() => setProfessorSelecionado(p.nome)}>
                                    <div className="foto-container">
                                        {p.foto ? <img src={p.foto} alt={p.nome} /> : <div className="foto-fallback">{p.nome[0]}</div>}
                                    </div>
                                    <div className="info-prof">
                                        <h4>{p.nome}</h4>
                                        <div className="stats-resumo">{p.totalAulas} aulas • {p.totalDinheiro.toFixed(2)}€</div>
                                    </div>
                                </div>
                            ))}


                            {professoresFiltrados.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                                    Nenhum professor encontrado com esse nome.
                                </p>
                            )}
                        </div>
                    </div>


                    <div className="painel-direito">
                        {professorSelecionado ? (
                            <div className="detalhe-conteudo">
                                <div className="cabecalho-detalhe">
                                    <div className="info-selecionada">
                                        {profFocado?.foto && <img src={profFocado.foto} className="foto-grande" alt="" />}
                                        <div className="texto-professor">
                                            <h2>{professorSelecionado}</h2>
                                            <div className="kpis">
                                                <div className="kpi-box"><span className="label">Aulas</span><span className="valor">{profFocado?.totalAulas}</span></div>
                                                <div className="kpi-box"><span className="label">Total</span><span className="valor">{profFocado?.totalDinheiro.toFixed(2)}€</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <TableComponent
                                    config={{
                                        columns: [
                                            { key: 'dataAula', value: 'Data' },
                                            { key: 'nomeAluno', value: 'Aluno' },
                                            { key: 'nomeEncarregado', value: 'Enc. Educação' },
                                            { key: 'valorTotal', value: 'Total', type: TableColumnTypesEnum.ChipMoney },
                                            { key: 'valorPago', value: 'Pago', type: TableColumnTypesEnum.ChipMoney },
                                            { key: 'valorEmFalta', value: 'Em dívida', type: TableColumnTypesEnum.ChipMoney },
                                            { key: 'estadoTabela', value: 'Estado', type: TableColumnTypesEnum.Chip }
                                        ],
                                        filters: [
                                            { key: 'estadoTabela', label: 'Filtrar Pagamento', value: '', options: [{ value: '', label: 'Todos' }, { value: 'Pago', label: 'Pago' }, { value: 'Pendente', label: 'Pendente' }, { value: 'Atrasado', label: 'Atrasado' }] }
                                        ]
                                    }}
                                    data={tableData}
                                />
                            </div>
                        ) : (
                            <div className="empty-state">
                                <h3>Selecione um professor para detalhe</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
