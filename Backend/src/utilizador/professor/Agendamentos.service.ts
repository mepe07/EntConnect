import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Agendamentos.
 */

@Injectable()
export class AgendamentosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Executa a operacao get agendamentos professor.
   * @param idProfessor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getAgendamentosProfessor(idProfessor: number) {
    const now = new Date();

    const futureSessions = await this.prisma.coaching.findMany({
      where: {
        ID_Professor: idProfessor,

        Inicio_Coaching: {
          gte: now,
        },

        ID_Estado_Coaching: 7,
      },
      include: {
        Professor: {
          include: {
            Pessoa: true,
          },
        },
        Disponibilidade: true,
        Estado_Coaching: true,
        Coaching_Aluno: {
          include: {
            Aluno: true,
          },
        },
      },
      orderBy: {
        Inicio_Coaching: 'asc',
      },
    });

    return futureSessions.map((session) => ({
      idCoaching: session.ID_Coaching,
      nomeProfessor: session.Professor?.Pessoa?.Nome || 'N/A',
      data: session.Inicio_Coaching
        ? session.Inicio_Coaching.toLocaleDateString('pt-PT')
        : 'N/A',
      horario:
        session.Inicio_Coaching && session.Duracao
          ? `${session.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${new Date(session.Inicio_Coaching.getTime() + session.Duracao * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
          : 'N/A',
      modalidade: session.Disponibilidade?.Modalidade || 'N/A',
      estado: session.Estado_Coaching?.Tipo || 'N/A',
      alunos: session.Coaching_Aluno.map((ca) => ({
        idAluno: ca.ID_Aluno,
        nome: ca.Aluno.Nome,
      })),
    }));
  }

  /**
   * Executa a operacao get confirmacoes professor.
   * @param idProfessor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getConfirmacoesProfessor(idProfessor: number) {
    const now = new Date();

    const pastSessions = await this.prisma.coaching.findMany({
      where: {
        ID_Professor: idProfessor,
        Inicio_Coaching: {
          lt: now,
        },
        ID_Estado_Coaching: 7,
      },
      include: {
        Professor: {
          include: {
            Pessoa: true,
          },
        },
        Disponibilidade: true,
        Estado_Coaching: true,
        Coaching_Aluno: {
          include: {
            Aluno: true,
          },
        },
      },
      orderBy: {
        Inicio_Coaching: 'desc',
      },
    });

    return pastSessions.map((session) => ({
      idCoaching: session.ID_Coaching,
      nomeProfessor: session.Professor?.Pessoa?.Nome || 'N/A',
      data: session.Inicio_Coaching
        ? session.Inicio_Coaching.toLocaleDateString('pt-PT')
        : 'N/A',
      horario:
        session.Inicio_Coaching && session.Duracao
          ? `${session.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${new Date(session.Inicio_Coaching.getTime() + session.Duracao * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
          : 'N/A',
      modalidade: session.Disponibilidade?.Modalidade || 'N/A',
      estado: session.Estado_Coaching?.Tipo || 'N/A',
      alunos: session.Coaching_Aluno.map((ca) => ({
        idAluno: ca.ID_Aluno,
        nome: ca.Aluno.Nome,
      })),
    }));
  }

  /**
   * Executa a operacao atualizar confirmacao professor.
   * @param idProfessor Dados recebidos para a operacao.
   * @param idCoaching Dados recebidos para a operacao.
   * @param idEstadoCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async atualizarConfirmacaoProfessor(
    idProfessor: number,
    idCoaching: number,
    idEstadoCoaching: number,
  ) {
    if (![13, 14].includes(idEstadoCoaching)) {
      throw new Error('ID de estado de coaching inválido.');
    }

    const coaching = await this.prisma.coaching.findFirst({
      where: {
        ID_Coaching: idCoaching,
        ID_Professor: idProfessor,
      },
    });

    if (!coaching) {
      throw new Error('Sessão de coaching não encontrada para este professor.');
    }

    await this.prisma.coaching.update({
      where: { ID_Coaching: idCoaching },
      data: { ID_Estado_Coaching: idEstadoCoaching },
    });

    return {
      message: 'Estado de coaching atualizado com sucesso.',
    };
  }
}
