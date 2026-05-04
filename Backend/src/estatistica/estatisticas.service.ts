import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Estatisticas.
 */

@Injectable()
export class EstatisticasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao calcular tendencia.
   * @param atual Dados recebidos para a operacao.
   * @param passado Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private calcularTendencia(atual: number, passado: number): number {
    if (passado === 0) return atual > 0 ? 100 : 0;
    return ((atual - passado) / passado) * 100;
  }

  /**
   * Executa a operacao get alunos.
   * @returns Resultado da operacao.
   */

  async getAlunos() {
    try {
      const total = await this.prisma.aluno.count();
      return { total, tendencia: 0 };
    } catch (e) {
      return { total: 0, tendencia: 0 };
    }
  }

  /**
   * Executa a operacao get aulas hoje.
   * @returns Resultado da operacao.
   */

  async getAulasHoje() {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);

      const totalHoje = await this.prisma.coaching.count({
        where: { Inicio_Coaching: { gte: hoje, lt: amanha } },
      });

      const totalOntem = await this.prisma.coaching.count({
        where: { Inicio_Coaching: { gte: ontem, lt: hoje } },
      });

      let tendencia = 0;
      if (totalOntem === 0) {
        tendencia = totalHoje > 0 ? 100 : 0;
      } else {
        tendencia = ((totalHoje - totalOntem) / totalOntem) * 100;
      }

      return { total: totalHoje, tendencia };
    } catch (e) {
      return { total: 0, tendencia: 0 };
    }
  }

  /**
   * Executa a operacao get dashboard encarregado.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getDashboardEncarregado(idUtilizador: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      select: { ID_Pessoa: true },
    });

    if (!utilizador || !utilizador.ID_Pessoa) {
      return {
        pagamentosAtraso: 0,
        sessoesConfirmar: 0,
        sessoesMarcadas: 0,
        totalEducandos: 0,
      };
    }

    const idPessoa = utilizador.ID_Pessoa;

    const faturas = await this.prisma.coaching_Aluno.findMany({
      where: {
        ID_Enc_Educacao: idPessoa,
        ValorEmFalta: { gt: 0 },
      },
    });
    const pagamentosAtraso = faturas.reduce(
      (soma, f) => soma + Number(f.ValorEmFalta),
      0,
    );

    const totalEducandos = await this.prisma.aluno.count({
      where: { ID_Enc_Educacao: idPessoa },
    });

    const sessoes = await this.prisma.coaching_Aluno.findMany({
      where: { ID_Enc_Educacao: idPessoa },
      include: { Coaching: true },
    });

    const sessoesConfirmar = sessoes.filter(
      (s) => s.Coaching?.ID_Estado_Coaching === 6,
    ).length;
    const sessoesMarcadas = sessoes.filter(
      (s) => s.Coaching?.ID_Estado_Coaching === 7,
    ).length;

    return {
      pagamentosAtraso,
      sessoesConfirmar,
      sessoesMarcadas,
      totalEducandos,
    };
  }

  /**
   * Executa a operacao get dashboard professor.
   * @param idUtilizador Dados recebidos para a operacao.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getDashboardProfessor(
    idUtilizador: number,
    dataInicio: string,
    dataFim: string,
  ) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      select: { ID_Pessoa: true },
    });

    if (!utilizador)
      return {
        sessoesConcluidas: 0,
        aulasHojeTotal: 0,
        aulasHojeDuracao: '0h',
      };

    const idProfessor = utilizador.ID_Pessoa;

    const sessoesConcluidas = await this.prisma.coaching.count({
      where: {
        ID_Professor: idProfessor,
        ID_Estado_Coaching: 8,
        Inicio_Coaching: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim + 'T23:59:59'),
        },
      },
    });

    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);

    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);

    const aulasHoje = await this.prisma.coaching.findMany({
      where: {
        ID_Professor: idProfessor,
        Inicio_Coaching: {
          gte: hojeInicio,
          lte: hojeFim,
        },
      },
    });

    const aulasHojeTotal = aulasHoje.length;

    const minutosTotais = aulasHoje.reduce(
      (soma, aula) => soma + (aula.Duracao || 0),
      0,
    );

    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;

    let aulasHojeDuracao = '0h';
    if (horas > 0 && minutos > 0) aulasHojeDuracao = `${horas}h${minutos}min`;
    else if (horas > 0) aulasHojeDuracao = `${horas}h`;
    else if (minutos > 0) aulasHojeDuracao = `${minutos}min`;

    return {
      sessoesConcluidas,
      aulasHojeTotal,
      aulasHojeDuracao,
    };
  }
}
