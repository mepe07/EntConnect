import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { PrismaService } from '../prisma/prisma.service';


/**
 * Servico responsavel pela logica de Coaching.
 */

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo registo.
   * @param createCoachingDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async create(createCoachingDto: CreateCoachingDto) {
    this.logger.log(
      `A criar coaching idProfessor=${createCoachingDto.ID_Professor} idSala=${createCoachingDto.ID_Sala} idEstado=${createCoachingDto.ID_Estado_Coaching}`,
    );

    const coaching = await this.prisma.coaching.create({
      data: createCoachingDto,
    });

    this.logger.log(`Coaching criado idCoaching=${coaching.ID_Coaching}`);
    return coaching;
  }

  /**
   * Executa a operacao inscrever aluno.
   * @param idDisponibilidade Dados recebidos para a operacao.
   * @param body Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async inscreverAluno(idDisponibilidade: number, body: any) {
    this.logger.log(
      `A inscrever aluno em coaching idDisponibilidade=${idDisponibilidade} idAluno=${body.idAluno} idEncEducacao=${body.idEncEducacao}`,
    );

    const disponibilidadeInfo = await this.prisma.disponibilidade.findUnique({
      where: { ID_Disponibilidade: idDisponibilidade },
      select: { MaxAlunos: true },
    });

    if (!disponibilidadeInfo || (disponibilidadeInfo.MaxAlunos ?? 0) < 1) {
      this.logger.warn(
        `Inscricao rejeitada por falta de vagas idDisponibilidade=${idDisponibilidade} idAluno=${body.idAluno}`,
      );
      throw new Error('Não existem vagas disponíveis para esta sessão.');
    }

    let coaching = await this.prisma.coaching.findFirst({
      where: { ID_Disponibilidade: idDisponibilidade },
    });

    if (!coaching) {
      coaching = await this.prisma.coaching.create({
        data: {
          ID_Professor: body.idProfessor,
          ID_Estado_Coaching: body.idEstadoCoaching,
          ID_Sala: body.idSala,
          ID_Coordenador: body.idCoordenador,
          ValorPorAluno: body.valorPorAluno,
          Inicio_Coaching: new Date(body.inicio_Coaching),
          Duracao: body.duracao,
          ID_Disponibilidade: idDisponibilidade,
        },
      });
      this.logger.log(
        `Coaching criado automaticamente para inscricao idCoaching=${coaching.ID_Coaching} idDisponibilidade=${idDisponibilidade}`,
      );
    }

    const novaInscricao = await this.prisma.coaching_Aluno.create({
      data: {
        ID_Coaching: coaching.ID_Coaching,
        ID_Aluno: body.idAluno,
        Observacoes: body.obs || null,
        Data_Inscricao: new Date(),
        ValorEmFalta: body.valorEmFalta,
        ID_Enc_Educacao: body.idEncEducacao,
      },
    });

    await this.prisma.disponibilidade.update({
      where: {
        ID_Disponibilidade: idDisponibilidade,
      },
      data: {
        MaxAlunos: {
          decrement: 1,
        },
      },
    });
    this.logger.log(
      `Aluno inscrito com sucesso idCoaching=${coaching.ID_Coaching} idAluno=${body.idAluno} idDisponibilidade=${idDisponibilidade}`,
    );

    return {
      message: 'Aluno inscrito com sucesso!',
      inscricao: novaInscricao,
    };
  }

  /**
   * Executa a operacao remover aluno.
   * @param idAluno Dados recebidos para a operacao.
   * @param idCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async removerAluno(idAluno: number, idCoaching: number) {
    this.logger.log(
      `A remover aluno de coaching idCoaching=${idCoaching} idAluno=${idAluno}`,
    );

    let coachingAluno = await this.prisma.coaching_Aluno.findFirst({
      where: {
        ID_Aluno: idAluno,
        ID_Coaching: idCoaching,
      },
    });

    if (!coachingAluno) {
      this.logger.warn(
        `Remocao de aluno rejeitada: inscricao inexistente idCoaching=${idCoaching} idAluno=${idAluno}`,
      );
      throw new Error('Inscrição não encontrada!');
    }

    const coaching = await this.prisma.coaching.findUnique({
      where: { ID_Coaching: idCoaching },
      select: { ID_Disponibilidade: true },
    });

    const totalInscritos = await this.prisma.coaching_Aluno.count({
      where: {
        ID_Coaching: idCoaching,
      },
    });

    await this.prisma.coaching_Aluno.delete({
      where: {
        ID_Coaching_ID_Aluno: {
          ID_Aluno: idAluno,
          ID_Coaching: idCoaching,
        },
      },
    });

    if (coaching && coaching.ID_Disponibilidade) {
      await this.prisma.disponibilidade.update({
        where: {
          ID_Disponibilidade: coaching.ID_Disponibilidade,
        },
        data: {
          MaxAlunos: {
            increment: 1,
          },
        },
      });
    }

    if (totalInscritos == 1) {
      await this.prisma.coaching.delete({
        where: {
          ID_Coaching: idCoaching,
        },
      });
      this.logger.log(`Coaching removido por ficar sem alunos idCoaching=${idCoaching}`);
    }

    this.logger.log(
      `Aluno removido com sucesso idCoaching=${idCoaching} idAluno=${idAluno}`,
    );
    return { message: 'Aluno removido com sucesso!' };
  }

  /**
   * Executa a operacao get sessoes futuras admin.
   * @returns Resultado da operacao.
   */

  async getSessoesFuturasAdmin() {
    const now = new Date();
    const futureSessions = await this.prisma.coaching.findMany({
      where: {
        Inicio_Coaching: {
          gte: now,
        },
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
        nome: ca.Aluno?.Nome || 'Aluno não encontrado',
      })),
    }));
  }

  async getSessoesPorValidarAdmin() {
    const now = new Date();
    const sessions = await this.prisma.coaching.findMany({
      where: {
        Inicio_Coaching: {
          lt: now,
        },
        Estado_Coaching: {
          Tipo: 'Pendente',
        },
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

    return sessions.map((session) => ({
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
        nome: ca.Aluno?.Nome || 'Aluno não encontrado',
      })),
    }));
  }

  async getSessoesRealizadasMesAdmin() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const sessions = await this.prisma.coaching.findMany({
      where: {
        Inicio_Coaching: {
          gte: monthStart,
          lte: monthEnd,
        },
        Estado_Coaching: {
          Tipo: 'Realizada',
        },
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

    return sessions.map((session) => ({
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
        nome: ca.Aluno?.Nome || 'Aluno não encontrado',
      })),
    }));
  }

  /**
   * Executa a operacao get kpis admin.
   * @returns Resultado da operacao.
   */

  async getKpisAdmin() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const next24h = new Date(now);
    next24h.setHours(next24h.getHours() + 24);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const proximas24h = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          gte: now,
          lte: next24h,
        },
      },
    });

    const marcadas = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          gte: now,
        },
      },
    });

    const porValidar = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          lt: now,
        },
        Estado_Coaching: {
          Tipo: 'Pendente',
        },
      },
    });

    const realizadasMes = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          gte: monthStart,
          lte: monthEnd,
        },
        Estado_Coaching: {
          Tipo: 'Realizada',
        },
      },
    });

    return {
      proximas24h,
      marcadas,
      porValidar,
      realizadasMes,
    };
  }

  /**
   * Executa a operacao get aluno detalhes.
   * @param idAluno Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getAlunoDetalhes(idAluno: number) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { ID_aluno: idAluno },
      include: {
        Enc_Educacao: {
          include: {
            Pessoa: true,
          },
        },
      },
    });

    if (!aluno) {
      throw new Error('Aluno não encontrado.');
    }

    return {
      idAluno: aluno.ID_aluno,
      nome: aluno.Nome,
      dataNascimento:
        aluno.Data_Nascimento?.toISOString().split('T')[0] ?? null,
      nif: aluno.NIF,
      email: aluno.Mail ?? null,
      contacto: aluno.Contato ?? null,
      menorIdade: aluno.Menor_Idade,
      encarregado: aluno.Enc_Educacao
        ? {
            nome: aluno.Enc_Educacao.Pessoa?.Nome || 'Sem encarregado',
            email: aluno.Enc_Educacao.Pessoa?.Email || null,
            contacto: aluno.Enc_Educacao.Pessoa?.Contacto || null,
          }
        : null,
    };
  }

  /**
   * Executa a operacao get marcacoes professor.
   * @param role Dados recebidos para a operacao.
   * @param userId Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getMarcacoesProfessor(role: string, userId: number) {
    let filtroCoaching: any = {};

    if (role === 'Professor') {
      filtroCoaching = {
        Professor: {
          Pessoa: { Utilizador: { ID_Utilizador: userId } },
        },
      };
    }

    const marcacoes = await this.prisma.coaching.findMany({
      where: filtroCoaching,
      include: {
        Sala: true,
        Estado_Coaching: true,
        Disponibilidade: true,
        Coaching_Aluno: {
          include: { Aluno: true },
        },
      },
      orderBy: { Inicio_Coaching: 'asc' },
    });

    return marcacoes.map((aula) => {
      const nomesAlunos = aula.Coaching_Aluno.map(
        (ligacao) => ligacao.Aluno?.Nome,
      ).filter((nome) => nome !== undefined);

      return {
        idCoaching: aula.ID_Coaching,
        idEstadoCoaching: aula.ID_Estado_Coaching,
        dataInicio: aula.Inicio_Coaching,
        duracaoMinutos: aula.Duracao,
        sala: aula.Sala?.Nome || 'Sem sala atribuída',
        modalidade: aula.Disponibilidade?.Modalidade || 'Sem modalidade',
        alunos: nomesAlunos,
        totalAlunos: nomesAlunos.length,
        estado: aula.Estado_Coaching?.Tipo || 'Pendente',
        confirmacao_prof: aula.confirmacao_prof,
      };
    });
  }

  /**
   * Executa a operacao confirmar sessao professor.
   * @param idCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async confirmarSessaoProfessor(idCoaching: number) {
    this.logger.log(`Professor a confirmar sessao idCoaching=${idCoaching}`);

    const sessao = await this.prisma.coaching.findUnique({
      where: { ID_Coaching: idCoaching },
    });

    if (!sessao) {
      this.logger.warn(
        `Confirmacao de sessao rejeitada: coaching inexistente idCoaching=${idCoaching}`,
      );
      throw new NotFoundException(
        `Sessão de coaching com ID ${idCoaching} não encontrada.`,
      );
    }

    const agora = new Date();
    const dataInicio = new Date(sessao.Inicio_Coaching!);

    if (agora < dataInicio) {
      this.logger.warn(
        `Confirmacao de sessao rejeitada: sessao ainda nao iniciada idCoaching=${idCoaching}`,
      );
      throw new BadRequestException(
        'Não pode confirmar uma sessão que ainda não se iniciou.',
      );
    }

    if (sessao.ID_Estado_Coaching === 13) {
      this.logger.warn(
        `Confirmacao de sessao rejeitada: sessao ja concluida idCoaching=${idCoaching}`,
      );
      throw new BadRequestException('Esta sessão já se encontra concluída.');
    }

    let novoEstado = sessao.ID_Estado_Coaching;

    if (sessao.confirmacao_EE === true) {
      novoEstado = 13;
    }

    const sessaoAtualizada = await this.prisma.coaching.update({
      where: { ID_Coaching: idCoaching },
      data: {
        confirmacao_prof: true,
        ID_Estado_Coaching: novoEstado,
      },
    });

    this.logger.log(
      `Sessao confirmada por professor idCoaching=${idCoaching} novoEstado=${novoEstado}`,
    );
    return sessaoAtualizada;
  }
}
