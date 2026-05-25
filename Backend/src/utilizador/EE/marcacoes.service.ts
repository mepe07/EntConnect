import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Marcacoes.
 */

@Injectable()
export class MarcacoesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao get marcacoesby ee.
   * @param idEE Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getMarcacoesbyEE(idEE: number) {
    return this.prisma.coaching_Aluno.findMany({
      where: {
        ID_Enc_Educacao: idEE,
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
            Disponibilidade: {
              select: {
                Modalidade: true,
              },
            },
            Modalidade: true,
            Estado_Coaching: true,
            Sala: true,
          },
        },
      },
    });
  }

  /**
   * Executa a operacao get confirmacoes by ee.
   * @param idEE Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getConfirmacoesByEE(idEE: number) {
    const now = new Date();

    const registros = await this.prisma.coaching_Aluno.findMany({
      where: {
        ID_Enc_Educacao: idEE,
        confirmado: false,
        Coaching: {
          Inicio_Coaching: {
            lt: now,
          },
          ID_Estado_Coaching: 7,
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
            Disponibilidade: true,
            Modalidade: true,
            Estado_Coaching: true,
            Coaching_Aluno: {
              include: {
                Aluno: true,
              },
            },
          },
        },
      },
      orderBy: {
        Data_Inscricao: 'desc',
      },
    });

    const sessionsMap = new Map<number, any>();

    for (const registro of registros) {
      const coaching = registro.Coaching;
      if (!coaching) continue;

      const data = coaching.Inicio_Coaching
        ? coaching.Inicio_Coaching.toLocaleDateString('pt-PT')
        : 'N/A';
      const horario =
        coaching.Inicio_Coaching && coaching.Duracao
          ? `${coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${new Date(coaching.Inicio_Coaching.getTime() + coaching.Duracao * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
          : 'N/A';

      const session = sessionsMap.get(coaching.ID_Coaching) ?? {
        idCoaching: coaching.ID_Coaching,
        data,
        horario,
        modalidade:
          coaching.Modalidade?.Descricao ||
          coaching.Disponibilidade?.Modalidade ||
          'N/A',
        estado: coaching.Estado_Coaching?.Tipo || 'N/A',
        professor: coaching.Professor?.Pessoa?.Nome || 'N/A',
        alunos: [] as Array<{ idAluno: number; nome: string }>,
      };

      if (!sessionsMap.has(coaching.ID_Coaching)) {
        sessionsMap.set(coaching.ID_Coaching, session);
      }

      session.alunos.push({
        idAluno: registro.ID_Aluno,
        nome: registro.Aluno?.Nome || 'N/A',
      });
    }

    return Array.from(sessionsMap.values());
  }

  /**
   * Executa a operacao confirmar sessao by ee.
   * @param idEE Dados recebidos para a operacao.
   * @param idCoaching Dados recebidos para a operacao.
   * @param idEstadoCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async confirmarSessaoByEE(
    idEE: number,
    idCoaching: number,
    idEstadoCoaching: number,
  ) {
    if (![13, 14].includes(idEstadoCoaching)) {
      throw new Error('ID de estado de coaching inválido.');
    }

    await this.prisma.coaching_Aluno.updateMany({
      where: {
        ID_Enc_Educacao: idEE,
        ID_Coaching: idCoaching,
      },
      data: {
        confirmado: true,
      },
    });

    const pendentes = await this.prisma.coaching_Aluno.count({
      where: {
        ID_Coaching: idCoaching,
        confirmado: false,
      },
    });

    let sessaoConcluida = false;

    if (pendentes === 0) {
      const coaching = await this.prisma.coaching.findUnique({
        where: { ID_Coaching: idCoaching },
        select: {
          ID_Estado_Coaching: true,
          confirmacao_prof: true,
        },
      });

      const deveConcluirSessao =
        idEstadoCoaching === 13 && coaching?.confirmacao_prof === true;
      sessaoConcluida = deveConcluirSessao;

      await this.prisma.coaching.update({
        where: { ID_Coaching: idCoaching },
        data: {
          ID_Estado_Coaching: deveConcluirSessao
            ? 13
            : coaching?.ID_Estado_Coaching,
          confirmacao_EE: true,
        },
      });
    }

    return {
      message: sessaoConcluida
        ? 'Sessão finalizada com sucesso (professor e encarregado confirmaram).'
        : pendentes === 0
          ? 'Confirmação do encarregado registada. A aguardar confirmação do professor.'
          : 'Confirmação registada. A aguardar confirmação dos restantes alunos.',
    };
  }
}
