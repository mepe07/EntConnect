import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
/**
 * Servico responsavel pela logica de Faturacao.
 */

@Injectable()
export class FaturacaoService {
  private readonly logger = new Logger(FaturacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao obter pagamentos coaching admin.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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

        const pessoaEE =
          item.Enc_Educacao?.Pessoa ?? item.Aluno?.Enc_Educacao?.Pessoa ?? null;

        return {
          idCoaching: item.ID_Coaching,
          idAluno: item.ID_Aluno,
          dataAula,
          nomeProfessor:
            item.Coaching?.Professor?.Pessoa?.Nome || 'Professor nao atribuido',
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
   * Executa a operacao to number.
   * @param valor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private toNumber(valor: unknown): number {
    return Number(valor ?? 0) || 0;
  }

  /**
   * Executa a operacao fim do dia.
   * @param data Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private fimDoDia(data: Date): Date {
    const fim = new Date(data);
    fim.setHours(23, 59, 59, 999);
    return fim;
  }

  /**
   * Executa a operacao obter valor total aluno.
   * @param item Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private obterValorTotalAluno(item: {
    Coaching?: {
      ValorPorAluno?: Prisma.Decimal | number | string | null;
    } | null;
  }): number {
    return this.toNumber(item.Coaching?.ValorPorAluno);
  }

  /**
   * Executa a operacao obter valor em falta.
   * @param item Dados recebidos para a operacao.
   * @param valorTotal Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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
   * Executa a operacao obter faturacao geral.
   * @returns Resultado da operacao.
   */

  async obterFaturacaoGeral() {
    const faturasPendentes = await this.prisma.coaching_Aluno.findMany({
      where: {
        OR: [{ ValorEmFalta: { gt: 0 } }, { ValorEmFalta: null }],
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
        nomeProfessor:
          item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
        fotoProfessorUrl: item.Coaching?.Professor?.Pessoa?.Foto || null,
        nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
        nomeEncarregado:
          item.Aluno?.Enc_Educacao?.Pessoa?.Nome || 'Sem encarregado',
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
   * Executa a operacao obter relatorio faturacao geral.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @param role Dados recebidos para a operacao.
   * @param userId Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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
            Modalidade: true,
          },
        },
      },
      orderBy: {
        Coaching: {
          Inicio_Coaching: 'asc',
        },
      },
    });

    const resumoEstudios: Record<
      string,
      {
        nome: string;
        totalFaturado: number;
        totalPago: number;
        totalEmDivida: number;
        aulas: number;
        alunos: Set<number>;
      }
    > = {};

    const resumoModalidades: Record<
      string,
      {
        nome: string;
        totalFaturado: number;
        totalPago: number;
        totalEmDivida: number;
        aulas: number;
        alunos: Set<number>;
      }
    > = {};

    const alunosUnicos = new Set<number>();

    const faturas = inscricoes.map((item) => {
      const valorTotal = this.obterValorTotalAluno(item);
      const valorEmFalta = this.obterValorEmFalta(item, valorTotal);
      const estaPago = valorEmFalta <= 0;
      const pessoaEE =
        item.Enc_Educacao?.Pessoa ?? item.Aluno?.Enc_Educacao?.Pessoa ?? null;
      const dataAula = item.Coaching?.Inicio_Coaching ?? null;
      const agora = new Date();
      const estadoPagamento = estaPago
        ? 'pago'
        : dataAula && dataAula < agora
          ? 'atrasado'
          : 'pendente';

      const nomeSala = item.Coaching?.Sala?.Nome?.trim() || 'Sem estúdio';
      const nomeModalidade =
        item.Coaching?.Modalidade?.Descricao?.trim() || 'Sem modalidade';
      const idAluno = item.ID_Aluno;
      const valorPago = Math.max(valorTotal - valorEmFalta, 0);

      if (!resumoEstudios[nomeSala]) {
        resumoEstudios[nomeSala] = {
          nome: nomeSala,
          totalFaturado: 0,
          totalPago: 0,
          totalEmDivida: 0,
          aulas: 0,
          alunos: new Set<number>(),
        };
      }

      if (!resumoModalidades[nomeModalidade]) {
        resumoModalidades[nomeModalidade] = {
          nome: nomeModalidade,
          totalFaturado: 0,
          totalPago: 0,
          totalEmDivida: 0,
          aulas: 0,
          alunos: new Set<number>(),
        };
      }

      resumoEstudios[nomeSala].totalFaturado += valorTotal;
      resumoEstudios[nomeSala].totalPago += valorPago;
      resumoEstudios[nomeSala].totalEmDivida += valorEmFalta;
      resumoEstudios[nomeSala].aulas += 1;
      if (idAluno !== null && idAluno !== undefined) {
        resumoEstudios[nomeSala].alunos.add(idAluno);
      }

      resumoModalidades[nomeModalidade].totalFaturado += valorTotal;
      resumoModalidades[nomeModalidade].totalPago += valorPago;
      resumoModalidades[nomeModalidade].totalEmDivida += valorEmFalta;
      resumoModalidades[nomeModalidade].aulas += 1;
      if (idAluno !== null && idAluno !== undefined) {
        resumoModalidades[nomeModalidade].alunos.add(idAluno);
      }

      if (idAluno !== null && idAluno !== undefined) {
        alunosUnicos.add(idAluno);
      }

      return {
        idCoaching: item.ID_Coaching,
        idAluno: item.ID_Aluno,
        dataAula,
        nomeProfessor:
          item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
        emailProfessor: item.Coaching?.Professor?.Pessoa?.Email || null,
        fotoProfessorUrl: item.Coaching?.Professor?.Pessoa?.Foto || null,
        nomeAluno: item.Aluno?.Nome || 'Aluno desconhecido',
        nomeEncarregado: pessoaEE?.Nome || 'Sem encarregado',
        emailEncarregado: pessoaEE?.Email || null,
        contactoEncarregado: pessoaEE?.Contacto || null,

        valorTotal,

        valorPago,

        valorEmFalta,

        estaPago,
        estadoPagamento,

        isPago: estaPago,

        duracaoMinutos: item.Coaching?.Duracao || 0,
        salaNome: item.Coaching?.Sala?.Nome || 'Sem sala',
      };
    });

    const faturacaoPorEstudio = Object.values(resumoEstudios)
      .map((item) => ({
        nome: item.nome,
        totalFaturado: item.totalFaturado,
        totalPago: item.totalPago,
        totalEmDivida: item.totalEmDivida,
        aulas: item.aulas,
        alunos: item.alunos.size,
      }))
      .sort((a, b) => b.totalFaturado - a.totalFaturado);

    const faturacaoPorModalidade = Object.values(resumoModalidades)
      .map((item) => ({
        nome: item.nome,
        totalFaturado: item.totalFaturado,
        totalPago: item.totalPago,
        totalEmDivida: item.totalEmDivida,
        aulas: item.aulas,
        alunos: item.alunos.size,
      }))
      .sort((a, b) => b.totalFaturado - a.totalFaturado);

    return {
      faturas,
      faturacaoPorEstudio,
      faturacaoPorModalidade,
      totalAlunos: alunosUnicos.size,
    };
  }

  /**
   * Executa a operacao get historico coaching.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @param role Dados recebidos para a operacao.
   * @param userId Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getHistoricoCoaching(
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

    const aulasBD = await this.prisma.coaching_Aluno.findMany({
      where: {
        Coaching: filtroCoaching,
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
      const estadoRealDaDB =
        registo.Coaching?.Estado_Coaching?.Tipo || 'Sem Estado';

      return {
        idCoaching: registo.ID_Coaching,
        idAluno: registo.ID_Aluno,
        nomeAluno: registo.Aluno?.Nome || 'Aluno desconhecido',
        nomeProfessor:
          registo.Coaching?.Professor?.Pessoa?.Nome || 'Professor desconhecido',
        nomeSala: registo.Coaching?.Sala?.Nome || 'Sem sala',
        dataAula: dataDaAula.toISOString(),
        duracaoMinutos: registo.Coaching?.Duracao || 0,
        estadoAula: estadoRealDaDB,
      };
    });
  }

  /**
   * Executa a operacao get dashboard financeiro.
   * @param inicio Dados recebidos para a operacao.
   * @param fim Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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
   * Executa a operacao get previsao financeira.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao obter faturacao por encarregado.
   * @param idEncarregado Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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
        nomeProfessor:
          item.Coaching?.Professor?.Pessoa?.Nome || 'Professor não atribuído',
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
   * Executa a operacao registar pagamento.
   * @param idCoaching Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @param valorPago Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async registarPagamento(
    idCoaching: number,
    idAluno: number,
    valorPago?: number,
  ) {
    this.logger.log(
      `A registar pagamento idCoaching=${idCoaching} idAluno=${idAluno} valorPago=${valorPago ?? 'total'}`,
    );

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
      this.logger.warn(
        `Pagamento rejeitado: inscricao inexistente idCoaching=${idCoaching} idAluno=${idAluno}`,
      );
      throw new NotFoundException('Inscricao de coaching nao encontrada.');
    }

    const valorTotal = this.obterValorTotalAluno(registoAtual);
    const valorEmFaltaAtual = this.obterValorEmFalta(registoAtual, valorTotal);

    if (valorEmFaltaAtual <= 0) {
      this.logger.log(
        `Pagamento ignorado: inscricao ja paga idCoaching=${idCoaching} idAluno=${idAluno}`,
      );
      return {
        message: 'Esta inscricao ja esta paga.',
        idCoaching,
        idAluno,
        valorEmFalta: 0,
        valorPagoRegistado: 0,
      };
    }

    const pagamentoTotal = valorPago === undefined || valorPago === null;
    const valorARegistar = pagamentoTotal
      ? valorEmFaltaAtual
      : this.toNumber(valorPago);

    if (!pagamentoTotal && valorARegistar <= 0) {
      this.logger.warn(
        `Pagamento rejeitado: valor invalido idCoaching=${idCoaching} idAluno=${idAluno} valor=${valorARegistar}`,
      );
      throw new BadRequestException(
        'O valor do pagamento tem de ser superior a zero.',
      );
    }

    const valorPagoRegistado = Math.min(valorARegistar, valorEmFaltaAtual);
    const novoValorEmFalta = Math.max(
      valorEmFaltaAtual - valorPagoRegistado,
      0,
    );

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
    this.logger.log(
      `Pagamento registado idCoaching=${idCoaching} idAluno=${idAluno} valorPagoRegistado=${valorPagoRegistado} valorEmFalta=${novoValorEmFalta}`,
    );

    return {
      message: 'Pagamento registado com sucesso.',
      idCoaching: registo.ID_Coaching,
      idAluno: registo.ID_Aluno,
      valorEmFalta: this.toNumber(registo.ValorEmFalta),
      valorPagoRegistado,
    };
  }
}
