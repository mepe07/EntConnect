import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Calendario.
 */

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao to start of day.
   * @param date Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private toStartOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  /**
   * Executa a operacao to end of day.
   * @param date Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private toEndOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  }

  /**
   * Executa a operacao parse date.
   * @param dateString Dados recebidos para a operacao.
   * @param fallback Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private parseDate(dateString: string | undefined, fallback: Date): Date {
    if (!dateString) {
      return fallback;
    }

    const simpleDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    if (simpleDateMatch) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }

    return parsed;
  }

  /**
   * Executa a operacao get calendar items.
   * @param start Dados recebidos para a operacao.
   * @param end Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getCalendarItems(start?: string, end?: string) {
    const today = new Date();
    const startDate = this.parseDate(start, today);
    const endDate = this.parseDate(end, startDate);

    const normalizedStart = this.toStartOfDay(startDate);
    const normalizedEnd = this.toEndOfDay(endDate);

    const eventos = await this.prisma.evento.findMany({
      where: {
        Publico: true,
        Publicado: true,
        Ativo: true,
        AND: [
          {
            Data_Inicio: {
              lte: normalizedEnd,
            },
          },
          {
            OR: [
              {
                Data_Fim: {
                  gte: normalizedStart,
                },
              },
              {
                AND: [
                  {
                    Data_Fim: null,
                  },
                  {
                    Data_Inicio: {
                      gte: normalizedStart,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      orderBy: {
        Data_Inicio: 'asc',
      },
    });

    const coachings = await this.prisma.coaching.findMany({
      where: {
        Inicio_Coaching: {
          gte: normalizedStart,
          lte: normalizedEnd,
        },
      },
      include: {
        Professor: {
          include: {
            Pessoa: true,
          },
        },
        Sala: true,
        Disponibilidade: true,
        Estado_Coaching: true,
        _count: {
          select: {
            Coaching_Aluno: true,
          },
        },
      },
      orderBy: {
        Inicio_Coaching: 'asc',
      },
    });

    return {
      eventos: eventos.map((evento) => ({
        id: evento.ID_Evento,
        titulo: evento.Titulo,
        resumo: evento.Resumo,
        descricao: evento.Descricao,
        local: evento.Local,
        dataInicio: evento.Data_Inicio,
        dataFim: evento.Data_Fim,
        tipo: evento.Tipo,
      })),
      coachings: coachings.map((coaching) => ({
        idCoaching: coaching.ID_Coaching,
        inicioCoaching: coaching.Inicio_Coaching,
        duracao: coaching.Duracao,
        modalidade: coaching.Disponibilidade?.Modalidade || null,
        professor: coaching.Professor?.Pessoa?.Nome || null,
        sala: coaching.Sala?.Nome || null,
        estado: coaching.Estado_Coaching?.Tipo || null,
        inscritos: coaching._count.Coaching_Aluno,
      })),
    };
  }
}
