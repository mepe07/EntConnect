import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FaturacaoService {
    constructor(private readonly prisma: PrismaService) { }

    async obterPagamentosCoachingAdmin(filtros: {
        inicio?: Date;
        fim?: Date;
        professor?: string;
        encarregado?: string;
        estado?: string;
    }) {
        const filtroCoaching: Prisma.CoachingWhereInput = {};

        if (filtros.inicio || filtros.fim) {
            filtroCoaching.Inicio_Coaching = {
                ...(filtros.inicio ? { gte: filtros.inicio } : {}),
                ...(filtros.fim ? { lte: this.fimDoDia(filtros.fim) } : {}),
            };
        }

        const professor = filtros.professor?.trim();
        if (professor) {
            filtroCoaching.Professor = {
                Pessoa: {
                    OR: [
                        { Nome: { contains: professor } },
                        { Email: { contains: professor } },
                    ],
                },
            };
        }

        const where: Prisma.Coaching_AlunoWhereInput = {
            Coaching: filtroCoaching,
        };

        const encarregado = filtros.encarregado?.trim();
        if (encarregado) {
            where.OR = [
                {
                    Enc_Educacao: {
                        Pessoa: {
                            OR: [
                                { Nome: { contains: encarregado } },
                                { Email: { contains: encarregado } },
                            ],
                        },
                    },
                },
                {
                    Aluno: {
                        Enc_Educacao: {
                            Pessoa: {
                                OR: [
                                    { Nome: { contains: encarregado } },
                                    { Email: { contains: encarregado } },
                                ],
                            },
                        },
                    },
                },
            ];
        }

        const inscricoes = await this.prisma.coaching_Aluno.findMany({
            where,
            include: {
                Enc_Educacao: {
                    include: {
                        Pessoa: true,
                    },
                },
                Aluno: {
                    include: {
                        Enc_Educacao: {
                            include: {
                                Pessoa: true,
                            },
                        },
                    },
                },
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                        Estado_Coaching: true,
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        const agora = new Date();
        const estadoFiltro = filtros.estado?.trim().toLowerCase();

        return inscricoes
            .map((item) => {
                const valorTotal = this.obterValorTotalAluno(item);
                const valorEmFalta = this.obterValorEmFalta(item, valorTotal);
                const dataAula = item.Coaching?.Inicio_Coaching ?? null;
                const estaPago = valorEmFalta <= 0;
                const estadoPagamento = estaPago
                    ? 'pago'
                    : dataAula && dataAula < agora
                        ? 'atrasado'
                        : 'pendente';

                const pessoaEE = item.Enc_Educacao?.Pessoa ?? item.Aluno?.Enc_Educacao?.Pessoa ?? null;

                return {
                    idCoaching: item.ID_Coaching,
                    idAluno: item.ID_Aluno,
                    dataAula,
                    nomeProfessor: item.Coaching?.Professor?.Pessoa?.Nome || 'Professor nao atribuido',
                    emailProfessor: item.Coaching?.Professor?.Pessoa?.Email || null,
                    nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
                    nomeEncarregado: pessoaEE?.Nome || 'Sem encarregado',
                    emailEncarregado: pessoaEE?.Email || null,
                    contactoEncarregado: pessoaEE?.Contacto || null,
                    valorTotal,
                    valorPago: Math.max(valorTotal - valorEmFalta, 0),
                    valorEmFalta,
                    estaPago,
                    isPago: estaPago,
                    estadoPagamento,
                    estadoCoaching: item.Coaching?.Estado_Coaching?.Tipo || 'Sem estado',
                    duracaoMinutos: item.Coaching?.Duracao || 0,
                    salaNome: item.Coaching?.Sala?.Nome || 'Sem sala',
                };
            })
            .filter((item) => !estadoFiltro || item.estadoPagamento === estadoFiltro);
    }

    /**
     * Converte valores Decimal/number/string/null para number.
     * Isto evita repetir Number(...) espalhado pelo código.
     */
    private toNumber(valor: unknown): number {
        return Number(valor ?? 0) || 0;
    }

    /**
     * Garante que a data final apanha o dia inteiro.
     * Exemplo: 2026-04-24 passa a 2026-04-24 23:59:59.999.
     */
    private fimDoDia(data: Date): Date {
        const fim = new Date(data);
        fim.setHours(23, 59, 59, 999);
        return fim;
    }

    /**
     * Vai buscar o valor total correto por aluno.
     *
     * Antes o código lia:
     * item.ValorPorAluno
     *
     * Mas na BD atual o valor está em:
     * item.Coaching.ValorPorAluno
     */
    private obterValorTotalAluno(item: {
        Coaching?: {
            ValorPorAluno?: Prisma.Decimal | number | string | null;
        } | null;
    }): number {
        return this.toNumber(item.Coaching?.ValorPorAluno);
    }

    /**
     * Vai buscar o valor em falta.
     *
     * Se ValorEmFalta vier null, usamos o valor total como fallback.
     * Isto evita que registos antigos/migrados apareçam como 0€ por engano.
     */
    private obterValorEmFalta(
        item: {
            ValorEmFalta?: Prisma.Decimal | number | string | null;
        },
        valorTotal: number,
    ): number {
        if (item.ValorEmFalta === null || item.ValorEmFalta === undefined) {
            return valorTotal;
        }

        return this.toNumber(item.ValorEmFalta);
    }

    /**
     * Faturação geral.
     * Devolve inscrições com valores em dívida.
     */
    async obterFaturacaoGeral() {
        const faturasPendentes = await this.prisma.coaching_Aluno.findMany({
            where: {
                OR: [
                    { ValorEmFalta: { gt: 0 } },
                    { ValorEmFalta: null },
                ],
                Coaching: {
                    ValorPorAluno: { gt: 0 },
                },
            },
            include: {
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                    },
                },
                Aluno: {
                    include: {
                        Enc_Educacao: {
                            include: {
                                Pessoa: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        return faturasPendentes.map((item) => {
            const valorTotal = this.obterValorTotalAluno(item);
            const valorEmFalta = this.obterValorEmFalta(item, valorTotal);

            return {
                idCoaching: item.ID_Coaching,
                idAluno: item.ID_Aluno,
                dataAula: item.Coaching?.Inicio_Coaching,
                nomeProfessor: item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                fotoProfessorUrl: item.Coaching?.Professor?.Pessoa?.Foto || null,
                nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
                nomeEncarregado: item.Aluno?.Enc_Educacao?.Pessoa?.Nome || 'Sem encarregado',
                emailEncarregado: item.Aluno?.Enc_Educacao?.Pessoa?.Email || null,
                contactoEncarregado: item.Aluno?.Enc_Educacao?.Pessoa?.Contacto || null,
                valorTotal,
                valorEmFalta,
                estaPago: valorEmFalta <= 0,
                isPago: valorEmFalta <= 0,
                duracaoMinutos: item.Coaching?.Duracao || 0,
                salaNome: item.Coaching?.Sala?.Nome || 'Sem sala',
            };
        });
    }

    /**
     * Relatório de faturação geral.
     *
     * Este relatório é usado pela página de faturação.
     * A correção principal está em usar:
     * item.Coaching.ValorPorAluno
     *
     * em vez de:
     * item.ValorPorAluno
     */
    async obterRelatorioFaturacaoGeral(
        dataInicio: Date,
        dataFim: Date,
        role: string,
        userId: number,
    ) {
        const filtroCoaching: Prisma.CoachingWhereInput = {
            Inicio_Coaching: {
                gte: dataInicio,
                lte: this.fimDoDia(dataFim),
            },
        };

        if (role === 'Professor') {
            filtroCoaching.Professor = {
                Pessoa: {
                    Utilizador: {
                        ID_Utilizador: userId,
                    },
                },
            };
        }

        const condicoesFiltro: Prisma.Coaching_AlunoWhereInput = {
            Coaching: filtroCoaching,
        };

        const inscricoes = await this.prisma.coaching_Aluno.findMany({
            where: condicoesFiltro,
            include: {
                Enc_Educacao: {
                    include: {
                        Pessoa: true,
                    },
                },
                Aluno: {
                    include: {
                        Enc_Educacao: {
                            include: {
                                Pessoa: true,
                            },
                        },
                    },
                },
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        return inscricoes.map((item) => {
            const valorTotal = this.obterValorTotalAluno(item);
            const valorEmFalta = this.obterValorEmFalta(item, valorTotal);
            const estaPago = valorEmFalta <= 0;
            const pessoaEE = item.Enc_Educacao?.Pessoa ?? item.Aluno?.Enc_Educacao?.Pessoa ?? null;
            const dataAula = item.Coaching?.Inicio_Coaching ?? null;
            const agora = new Date();
            const estadoPagamento = estaPago
                ? 'pago'
                : dataAula && dataAula < agora
                    ? 'atrasado'
                    : 'pendente';

            return {
                idCoaching: item.ID_Coaching,
                idAluno: item.ID_Aluno,
                dataAula,
                nomeProfessor: item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                emailProfessor: item.Coaching?.Professor?.Pessoa?.Email || null,
                fotoProfessorUrl: item.Coaching?.Professor?.Pessoa?.Foto || null,
                nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
                nomeEncarregado: pessoaEE?.Nome || 'Sem encarregado',
                emailEncarregado: pessoaEE?.Email || null,
                contactoEncarregado: pessoaEE?.Contacto || null,

                // Valor total correto da aula por aluno.
                valorTotal,

                // Valor ja pago pelo aluno.
                valorPago: Math.max(valorTotal - valorEmFalta, 0),

                // Valor ainda por pagar.
                valorEmFalta,

                // O frontend usa "estaPago".
                estaPago,
                estadoPagamento,

                // Mantemos também "isPago" para compatibilidade com código antigo.
                isPago: estaPago,

                duracaoMinutos: item.Coaching?.Duracao || 0,
                salaNome: item.Coaching?.Sala?.Nome || 'Sem sala',
            };
        });
    }

/**
     * Relatório de histórico de coaching com filtro de segurança.
     */
    async getHistoricoCoaching(
        dataInicio: Date, 
        dataFim: Date, 
        role: string, 
        userId: number
    ) {
        // 1. Criamos o filtro base para o Coaching (Datas)
        const filtroCoaching: Prisma.CoachingWhereInput = {
            Inicio_Coaching: {
                gte: dataInicio,
                lte: this.fimDoDia(dataFim),
            },
        };

        // 2. APLICAR SEGURANÇA: Se for Professor, ele só vê as suas próprias sessões
        if (role === 'Professor') {
            filtroCoaching.Professor = {
                Pessoa: {
                    Utilizador: {
                        ID_Utilizador: userId,
                    },
                },
            };
        }

        // 3. O Prisma executa a pesquisa filtrada
        const aulasBD = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: filtroCoaching, // Aplicamos aqui a nossa "tranca"
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                        Estado_Coaching: true,
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        // 4. O mapeamento dos dados continua igual para o Frontend não notar a diferença
        return aulasBD.map((registo) => {
            const dataCrua = registo.Coaching?.Inicio_Coaching;
            const dataDaAula = dataCrua ? new Date(dataCrua) : new Date();
            const estadoRealDaDB = registo.Coaching?.Estado_Coaching?.Tipo || 'Sem Estado';

            return {
                idCoaching: registo.ID_Coaching,
                idAluno: registo.ID_Aluno,
                nomeAluno: registo.Aluno?.Nome || 'Aluno desconhecido',
                nomeProfessor: registo.Coaching?.Professor?.Pessoa?.Nome || 'Professor desconhecido',
                nomeSala: registo.Coaching?.Sala?.Nome || 'Sem sala',
                dataAula: dataDaAula.toISOString(),
                duracaoMinutos: registo.Coaching?.Duracao || 0,
                estadoAula: estadoRealDaDB,
            };
        });
    }

    /**
     * Relatório de histórico de coaching.
     *
     * Este relatório não depende diretamente dos valores financeiros,
     * por isso mantemos a lógica focada nos dados da aula.
     */
   /* async getHistoricoCoaching(dataInicio: Date, dataFim: Date) {
        const aulasBD = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: dataInicio,
                        lte: this.fimDoDia(dataFim),
                    },
                },
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                        Estado_Coaching: true,
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        return aulasBD.map((registo) => {
            const dataCrua = registo.Coaching?.Inicio_Coaching;
            const dataDaAula = dataCrua ? new Date(dataCrua) : new Date();
            const estadoRealDaDB = registo.Coaching?.Estado_Coaching?.Tipo || 'Sem Estado';

            return {
                idCoaching: registo.ID_Coaching,
                idAluno: registo.ID_Aluno,
                nomeAluno: registo.Aluno?.Nome || 'Aluno desconhecido',
                nomeProfessor: registo.Coaching?.Professor?.Pessoa?.Nome || 'Professor desconhecido',
                nomeSala: registo.Coaching?.Sala?.Nome || 'Sem sala',
                dataAula: dataDaAula.toISOString(),
                duracaoMinutos: registo.Coaching?.Duracao || 0,
                estadoAula: estadoRealDaDB,
            };
        });
    }
        */
    /**
     * Dashboard financeiro.
     *
     * Correção principal:
     * - valor total vem de Coaching.ValorPorAluno
     * - dívida vem de Coaching_Aluno.ValorEmFalta
     *
     * Assim deixamos de ter gráficos a 0 por causa da alteração da BD.
     */
    async getDashboardFinanceiro(inicio: Date, fim: Date) {
        const faturas = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: inicio,
                        lte: this.fimDoDia(fim),
                    },
                },
            },
            include: {
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        let totalPago = 0;
        let totalEmDivida = 0;

        const rankingProfessores: Record<string, number> = {};
        const evolucaoDiaria: Record<string, number> = {};

        const diaAtual = new Date(inicio);
        const dataFim = this.fimDoDia(fim);

        while (diaAtual <= dataFim) {
            const dataSimples = diaAtual.toISOString().split('T')[0];
            evolucaoDiaria[dataSimples] = 0;
            diaAtual.setDate(diaAtual.getDate() + 1);
        }

        faturas.forEach((fatura) => {
            const valorTotal = this.obterValorTotalAluno(fatura);
            const valorEmFalta = this.obterValorEmFalta(fatura, valorTotal);

            // Valor recebido = total da aula menos o que ainda falta pagar.
            const valorRecebido = Math.max(valorTotal - valorEmFalta, 0);

            totalPago += valorRecebido;
            totalEmDivida += valorEmFalta;

            const dataSessao = fatura.Coaching?.Inicio_Coaching;

            if (dataSessao instanceof Date) {
                const dataSimples = dataSessao.toISOString().split('T')[0];

                if (evolucaoDiaria[dataSimples] !== undefined) {
                    evolucaoDiaria[dataSimples] += valorRecebido;
                }
            }

            const nomeProfessor = fatura.Coaching?.Professor?.Pessoa?.Nome;

            if (nomeProfessor) {
                if (!rankingProfessores[nomeProfessor]) {
                    rankingProfessores[nomeProfessor] = 0;
                }

                rankingProfessores[nomeProfessor] += valorRecebido;
            }
        });

        const arrayEvolucao = Object.keys(evolucaoDiaria).map((data) => ({
            data,
            faturado: evolucaoDiaria[data],
        }));

        const arrayTopProfessores = Object.keys(rankingProfessores)
            .map((nome) => ({
                nome,
                total: rankingProfessores[nome],
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            resumoGeral: {
                totalPago,
                totalEmDivida,
            },
            evolucaoFinanceira: arrayEvolucao,
            topProfessores: arrayTopProfessores,
        };
    }

    /**
     * Previsão financeira para os próximos 3 meses.
     *
     * Aqui queremos saber quanto está previsto faturar,
     * por isso usamos Coaching.ValorPorAluno.
     */
    async getPrevisaoFinanceira() {
        const hoje = new Date();

        const daquiA3Meses = new Date();
        daquiA3Meses.setMonth(hoje.getMonth() + 3);

        const previsaoMensal: Record<string, number> = {};

        for (let i = 0; i < 3; i++) {
            const mesAlvo = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const nomeMes = mesAlvo.toLocaleString('pt-PT', { month: 'long' });
            const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
            const labelMesAno = `${mesFormatado} ${mesAlvo.getFullYear()}`;

            previsaoMensal[labelMesAno] = 0;
        }

        const aulasFuturas = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: hoje,
                        lte: daquiA3Meses,
                    },
                },
            },
            include: {
                Coaching: true,
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        aulasFuturas.forEach((fatura) => {
            const valorPrevisto = this.obterValorTotalAluno(fatura);

            if (fatura.Coaching?.Inicio_Coaching) {
                const data = new Date(fatura.Coaching.Inicio_Coaching);
                const nomeMes = data.toLocaleString('pt-PT', { month: 'long' });
                const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
                const labelMesAno = `${mesFormatado} ${data.getFullYear()}`;

                if (previsaoMensal[labelMesAno] !== undefined) {
                    previsaoMensal[labelMesAno] += valorPrevisto;
                }
            }
        });

        return Object.keys(previsaoMensal).map((mes) => ({
            mes,
            previsto: previsaoMensal[mes],
        }));
    }

    async obterFaturacaoPorEncarregado(idEncarregado: number) {
        const faturas = await this.prisma.coaching_Aluno.findMany({
            where: {
                ID_Enc_Educacao: idEncarregado,
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Sala: true,
                    },
                },
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc',
                },
            },
        });

        return faturas.map((item) => {
            const valorTotal = this.obterValorTotalAluno(item);
            const valorEmFalta = this.obterValorEmFalta(item, valorTotal);

            return {
                idCoaching: item.ID_Coaching,
                idAluno: item.ID_Aluno,
                dataAula: item.Coaching?.Inicio_Coaching,
                nomeProfessor: item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
                valorTotal,
                valorEmFalta,
                estaPago: valorEmFalta <= 0,
                isPago: valorEmFalta <= 0,
                duracaoMinutos: item.Coaching?.Duracao || 0,
                salaNome: item.Coaching?.Sala?.Nome || 'Sem sala',
            };
        });
    }

    /**
     * Regista o pagamento de um aluno numa sessão de coaching.
     *
     * Como agora o estado financeiro esta em ValorEmFalta,
     * pagar sem valor significa colocar ValorEmFalta a 0.
     * Quando vem valorPago, descontamos apenas esse montante.
     */
    async registarPagamento(idCoaching: number, idAluno: number, valorPago?: number) {
        const registoAtual = await this.prisma.coaching_Aluno.findUnique({
            where: {
                ID_Coaching_ID_Aluno: {
                    ID_Coaching: idCoaching,
                    ID_Aluno: idAluno,
                },
            },
            include: {
                Coaching: true,
            },
        });

        if (!registoAtual) {
            throw new NotFoundException('Inscricao de coaching nao encontrada.');
        }

        const valorTotal = this.obterValorTotalAluno(registoAtual);
        const valorEmFaltaAtual = this.obterValorEmFalta(registoAtual, valorTotal);

        if (valorEmFaltaAtual <= 0) {
            return {
                message: 'Esta inscricao ja esta paga.',
                idCoaching,
                idAluno,
                valorEmFalta: 0,
                valorPagoRegistado: 0,
            };
        }

        const pagamentoTotal = valorPago === undefined || valorPago === null;
        const valorARegistar = pagamentoTotal ? valorEmFaltaAtual : this.toNumber(valorPago);

        if (!pagamentoTotal && valorARegistar <= 0) {
            throw new BadRequestException('O valor do pagamento tem de ser superior a zero.');
        }

        const valorPagoRegistado = Math.min(valorARegistar, valorEmFaltaAtual);
        const novoValorEmFalta = Math.max(valorEmFaltaAtual - valorPagoRegistado, 0);

        const registo = await this.prisma.coaching_Aluno.update({
            where: {
                ID_Coaching_ID_Aluno: {
                    ID_Coaching: idCoaching,
                    ID_Aluno: idAluno,
                },
            },
            data: {
                ValorEmFalta: novoValorEmFalta,
            },
        });

        return {
            message: 'Pagamento registado com sucesso.',
            idCoaching: registo.ID_Coaching,
            idAluno: registo.ID_Aluno,
            valorEmFalta: this.toNumber(registo.ValorEmFalta),
            valorPagoRegistado,
        };
    }
} 
