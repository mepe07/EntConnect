import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { CreatePedidoCoachingDto } from './dto/create-pedido-coaching.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';


/**
 * Servico responsavel pela logica de Coaching.
 */

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getEstadoPedidoId(nome: string) {
    const delegate = (this.prisma as any).estado_Pedido;
    const estado = await delegate.findFirst({
      where: { Nome: { equals: nome } },
    });

    if (estado) return estado.ID_EstadoPedido;

    const novoEstado = await delegate.create({ data: { Nome: nome } });
    return novoEstado.ID_EstadoPedido;
  }

  private duracaoToDate(duracaoMinutos: number) {
    return new Date(Date.UTC(1970, 0, 1, 0, duracaoMinutos, 0));
  }

  private dateToDuracaoMinutos(value: Date | string | null | undefined) {
    if (!value) return 60;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 60;

    const base = Date.UTC(1970, 0, 1, 0, 0, 0);
    const diff = Math.round((date.getTime() - base) / 60000);
    if (diff > 0 && diff < 24 * 60) return diff;

    return date.getUTCHours() * 60 + date.getUTCMinutes() || 60;
  }

  private formatPedido(pedido: any) {
    const inicio = pedido.Hora_Inicio_Proposta
      ? new Date(pedido.Hora_Inicio_Proposta)
      : null;
    const duracao = this.dateToDuracaoMinutos(pedido.Duracao_Proposta);
    const fim = inicio ? new Date(inicio.getTime() + duracao * 60000) : null;
    const alunos = pedido.Pedido_Coaching_Aluno?.map((item: any) => ({
      idAluno: item.ID_Aluno,
      nome: item.Aluno?.Nome ?? 'Aluno',
    })) ?? [];
    const ee = pedido.Utilizador_Pedido_Coaching_ID_EEToUtilizador;
    const professor = pedido.Utilizador_Pedido_Coaching_ID_ProfessorToUtilizador;

    return {
      idPedido: pedido.ID_Pedido,
      idEncEducacao: ee?.ID_Pessoa ?? null,
      nomeEncEducacao: ee?.Pessoa?.Nome ?? 'Enc. educacao',
      idProfessor: professor?.ID_Pessoa ?? null,
      nomeProfessor: professor?.Pessoa?.Nome ?? 'Professor',
      idModalidade: pedido.ID_Modalidade,
      modalidade: pedido.Modalidade?.Descricao ?? 'Coaching',
      data: inicio ? inicio.toLocaleDateString('pt-PT') : 'N/A',
      horario: inicio && fim
        ? `${inicio.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${fim.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
        : 'N/A',
      inicio: inicio?.toISOString() ?? null,
      duracaoMinutos: duracao,
      estado: pedido.Estado_Pedido?.Nome ?? 'Pendente',
      mensagemEE: pedido.Mensagem_EE ?? null,
      mensagemProfessor: pedido.Mensagem_Professor ?? null,
      alunos,
    };
  }

  private normalizarTexto(value: string | null | undefined) {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

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
      select: {
        MaxAlunos: true,
        Professor: {
          include: {
            Professor_Modalidade: true,
          },
        },
      },
    });

    if (!disponibilidadeInfo || (disponibilidadeInfo.MaxAlunos ?? 0) < 1) {
      this.logger.warn(
        `Inscricao rejeitada por falta de vagas idDisponibilidade=${idDisponibilidade} idAluno=${body.idAluno}`,
      );
      throw new Error('Não existem vagas disponíveis para esta sessão.');
    }

    const professorPodeLecionar =
      disponibilidadeInfo.Professor?.Professor_Modalidade.some(
        (item) => item.ID_Modalidade === body.idModalidade,
      ) ?? false;

    if (!professorPodeLecionar) {
      this.logger.warn(
        `Inscricao rejeitada por modalidade invalida idDisponibilidade=${idDisponibilidade} idModalidade=${body.idModalidade}`,
      );
      throw new Error('O professor nao leciona a modalidade escolhida.');
    }

    const inicioCoaching = new Date(body.inicio_Coaching);

    let coaching = await this.prisma.coaching.findFirst({
      where: {
        ID_Disponibilidade: idDisponibilidade,
        ID_Modalidade: body.idModalidade,
        Inicio_Coaching: inicioCoaching,
      },
      include: {
        Coaching_Aluno: true,
      },
    });

    if (
      coaching &&
      coaching.Coaching_Aluno.length >= (disponibilidadeInfo.MaxAlunos ?? 0)
    ) {
      this.logger.warn(
        `Inscricao rejeitada por lotacao cheia idDisponibilidade=${idDisponibilidade} idCoaching=${coaching.ID_Coaching}`,
      );
      throw new Error('NÃ£o existem vagas disponÃ­veis para esta sessÃ£o.');
    }

    if (!coaching) {
      coaching = await this.prisma.coaching.create({
        data: {
          ID_Professor: body.idProfessor,
          ID_Estado_Coaching: body.idEstadoCoaching,
          ID_Sala: body.idSala,
          ID_Coordenador: body.idCoordenador,
          ID_Modalidade: body.idModalidade,
          ValorPorAluno: body.valorPorAluno,
          Inicio_Coaching: inicioCoaching,
          Duracao: body.duracao,
          ID_Disponibilidade: idDisponibilidade,
        },
        include: {
          Coaching_Aluno: true,
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
        Modalidade: true,
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
      modalidade:
        session.Modalidade?.Descricao ||
        session.Disponibilidade?.Modalidade ||
        'N/A',
      estado: session.Estado_Coaching?.Tipo || 'N/A',
      alunos: session.Coaching_Aluno.map((ca) => ({
        idAluno: ca.ID_Aluno,
        nome: ca.Aluno?.Nome || 'Aluno não encontrado',
      })),
    }));
  }

  async listarContextoProposta(user: UtilizadorAutenticado) {
    const modalidades = await this.prisma.modalidade.findMany({
      orderBy: { Descricao: 'asc' },
    });
    const professores = await this.prisma.professor.findMany({
      include: {
        Pessoa: true,
        Professor_Modalidade: { include: { Modalidade: true } },
      },
      orderBy: { Pessoa: { Nome: 'asc' } },
    });

    const resposta: any = {
      modalidades: modalidades.map((modalidade) => ({
        idModalidade: modalidade.ID_Modalidade,
        descricao: modalidade.Descricao,
      })),
      professores: professores.map((professor) => ({
        idProfessor: professor.ID_Pessoa,
        nome: professor.Pessoa?.Nome ?? 'Professor',
        modalidades: professor.Professor_Modalidade.map((item) => ({
          idModalidade: item.ID_Modalidade,
          descricao: item.Modalidade.Descricao,
        })),
      })),
    };

    if (user.role === 'Enc_Educacao') {
      const alunos = await this.prisma.aluno.findMany({
        where: { ID_Enc_Educacao: user.idPessoa },
        orderBy: { Nome: 'asc' },
      });
      resposta.alunos = alunos.map((aluno) => ({
        idAluno: aluno.ID_aluno,
        nome: aluno.Nome,
      }));
    }

    return resposta;
  }

  async pesquisarEncarregadosComAlunos(search = '') {
    const termoNormalizado = this.normalizarTexto(search);
    const encarregados = await this.prisma.enc_Educacao.findMany({
      include: {
        Pessoa: true,
        Aluno: { orderBy: { Nome: 'asc' } },
      },
      orderBy: { Pessoa: { Nome: 'asc' } },
      take: 100,
    });

    return encarregados
      .filter((encarregado) => {
        if (!termoNormalizado) return true;

        const nome = this.normalizarTexto(encarregado.Pessoa?.Nome);
        const email = this.normalizarTexto(encarregado.Pessoa?.Email);

        return nome.includes(termoNormalizado) || email.includes(termoNormalizado);
      })
      .slice(0, 15)
      .map((encarregado) => ({
        idEncEducacao: encarregado.ID_Pessoa,
        nome: encarregado.Pessoa?.Nome ?? 'Enc. educacao',
        email: encarregado.Pessoa?.Email ?? null,
        alunos: encarregado.Aluno.map((aluno) => ({
          idAluno: aluno.ID_aluno,
          nome: aluno.Nome,
        })),
      }));
  }

  async criarPedidoCoaching(
    dto: CreatePedidoCoachingDto,
    user: UtilizadorAutenticado,
  ) {
    if (!['Enc_Educacao', 'Professor'].includes(user.role)) {
      throw new BadRequestException('Apenas EE ou professor podem propor coaching.');
    }

    const inicio = new Date(dto.inicio);
    if (Number.isNaN(inicio.getTime())) {
      throw new BadRequestException('Data de inicio invalida.');
    }
    if (inicio <= new Date()) {
      throw new BadRequestException('A proposta deve ser para uma data futura.');
    }

    const alunoIds = [...new Set(dto.alunosIds.map(Number))];
    if (alunoIds.length === 0) {
      throw new BadRequestException('Seleciona pelo menos um aluno.');
    }

    const idEncEducacaoPessoa =
      user.role === 'Enc_Educacao' ? user.idPessoa : dto.idEncEducacao;
    const idProfessorPessoa =
      user.role === 'Professor' ? user.idPessoa : dto.idProfessor;

    if (!idEncEducacaoPessoa || !idProfessorPessoa) {
      throw new BadRequestException('Seleciona encarregado e professor.');
    }

    const [eeUser, professorUser, professorModalidade, alunosValidos] =
      await Promise.all([
        this.prisma.utilizador.findFirst({
          where: { ID_Pessoa: idEncEducacaoPessoa, Pessoa: { Enc_Educacao: { is: {} } } },
        }),
        this.prisma.utilizador.findFirst({
          where: { ID_Pessoa: idProfessorPessoa, Pessoa: { Professor: { is: {} } } },
        }),
        this.prisma.professor_Modalidade.findUnique({
          where: {
            ID_Professor_ID_Modalidade: {
              ID_Professor: idProfessorPessoa,
              ID_Modalidade: dto.idModalidade,
            },
          },
        }),
        this.prisma.aluno.findMany({
          where: {
            ID_aluno: { in: alunoIds },
            ID_Enc_Educacao: idEncEducacaoPessoa,
          },
        }),
      ]);

    if (!eeUser) throw new NotFoundException('Encarregado de educacao nao encontrado.');
    if (!professorUser) throw new NotFoundException('Professor nao encontrado.');
    if (!professorModalidade) {
      throw new BadRequestException('O professor nao leciona a modalidade escolhida.');
    }
    if (alunosValidos.length !== alunoIds.length) {
      throw new BadRequestException('Todos os alunos selecionados devem pertencer ao encarregado escolhido.');
    }

    const idEstadoPendente = await this.getEstadoPedidoId('Pendente');
    const agora = new Date();
    const pedido = await (this.prisma as any).pedido_Coaching.create({
      data: {
        ID_EE: eeUser.ID_Utilizador,
        ID_Professor: professorUser.ID_Utilizador,
        ID_Modalidade: dto.idModalidade,
        Data_Proposta: inicio,
        Hora_Inicio_Proposta: inicio,
        Duracao_Proposta: this.duracaoToDate(dto.duracaoMinutos),
        Mensagem_EE: user.role === 'Enc_Educacao' ? dto.mensagem ?? null : null,
        Mensagem_Professor: user.role === 'Professor' ? dto.mensagem ?? null : null,
        ID_EstadoPedido: idEstadoPendente,
        Data_Criacao: agora,
        Data_Atualizacao: agora,
        Pedido_Coaching_Aluno: {
          create: alunoIds.map((idAluno) => ({ ID_Aluno: idAluno })),
        },
      },
      include: {
        Estado_Pedido: true,
        Modalidade: true,
        Utilizador_Pedido_Coaching_ID_EEToUtilizador: { include: { Pessoa: true } },
        Utilizador_Pedido_Coaching_ID_ProfessorToUtilizador: { include: { Pessoa: true } },
        Pedido_Coaching_Aluno: { include: { Aluno: true } },
      },
    });

    return {
      message: 'Proposta enviada para aprovacao da coordenacao.',
      pedido: this.formatPedido(pedido),
    };
  }

  async listarPedidosPendentesAdmin() {
    const idEstadoPendente = await this.getEstadoPedidoId('Pendente');
    const pedidos = await (this.prisma as any).pedido_Coaching.findMany({
      where: { ID_EstadoPedido: idEstadoPendente },
      include: {
        Estado_Pedido: true,
        Modalidade: true,
        Utilizador_Pedido_Coaching_ID_EEToUtilizador: { include: { Pessoa: true } },
        Utilizador_Pedido_Coaching_ID_ProfessorToUtilizador: { include: { Pessoa: true } },
        Pedido_Coaching_Aluno: { include: { Aluno: true } },
      },
      orderBy: { Hora_Inicio_Proposta: 'asc' },
    });

    return pedidos.map((pedido: any) => this.formatPedido(pedido));
  }

  async aprovarPedidoCoaching(idPedido: number, user: UtilizadorAutenticado) {
    const pedido = await (this.prisma as any).pedido_Coaching.findUnique({
      where: { ID_Pedido: idPedido },
      include: {
        Estado_Pedido: true,
        Utilizador_Pedido_Coaching_ID_EEToUtilizador: true,
        Utilizador_Pedido_Coaching_ID_ProfessorToUtilizador: true,
        Pedido_Coaching_Aluno: true,
      },
    });

    if (!pedido) throw new NotFoundException('Proposta nao encontrada.');
    if ((pedido.Estado_Pedido?.Nome ?? '').toLowerCase() !== 'pendente') {
      throw new BadRequestException('Esta proposta ja foi tratada.');
    }

    const alunos = pedido.Pedido_Coaching_Aluno ?? [];
    if (alunos.length === 0) {
      throw new BadRequestException('A proposta nao tem alunos associados.');
    }

    const idEstadoAprovado = await this.getEstadoPedidoId('Aprovado');
    const coaching = await this.prisma.$transaction(async (tx) => {
      const sessao = await tx.coaching.create({
        data: {
          ID_Professor: pedido.Utilizador_Pedido_Coaching_ID_ProfessorToUtilizador.ID_Pessoa,
          ID_Estado_Coaching: 7,
          ID_Coordenador: user.idPessoa,
          ID_Modalidade: pedido.ID_Modalidade,
          Inicio_Coaching: pedido.Hora_Inicio_Proposta,
          Duracao: this.dateToDuracaoMinutos(pedido.Duracao_Proposta),
        },
      });

      await tx.coaching_Aluno.createMany({
        data: alunos.map((item: any) => ({
          ID_Coaching: sessao.ID_Coaching,
          ID_Aluno: item.ID_Aluno,
          ID_Enc_Educacao: pedido.Utilizador_Pedido_Coaching_ID_EEToUtilizador.ID_Pessoa,
          Data_Inscricao: new Date(),
        })),
      });

      await (tx as any).pedido_Coaching.update({
        where: { ID_Pedido: idPedido },
        data: {
          ID_EstadoPedido: idEstadoAprovado,
          Data_Atualizacao: new Date(),
        },
      });

      return sessao;
    });

    return {
      message: 'Proposta aprovada e sessao criada.',
      idCoaching: coaching.ID_Coaching,
    };
  }

  async rejeitarPedidoCoaching(idPedido: number) {
    const pedido = await (this.prisma as any).pedido_Coaching.findUnique({
      where: { ID_Pedido: idPedido },
      include: { Estado_Pedido: true },
    });

    if (!pedido) throw new NotFoundException('Proposta nao encontrada.');
    if ((pedido.Estado_Pedido?.Nome ?? '').toLowerCase() !== 'pendente') {
      throw new BadRequestException('Esta proposta ja foi tratada.');
    }

    const idEstadoRejeitado = await this.getEstadoPedidoId('Rejeitado');
    await (this.prisma as any).pedido_Coaching.update({
      where: { ID_Pedido: idPedido },
      data: {
        ID_EstadoPedido: idEstadoRejeitado,
        Data_Atualizacao: new Date(),
      },
    });

    return { message: 'Proposta rejeitada.' };
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
        Modalidade: true,
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
      modalidade:
        session.Modalidade?.Descricao ||
        session.Disponibilidade?.Modalidade ||
        'N/A',
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
        Modalidade: true,
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
      modalidade:
        session.Modalidade?.Descricao ||
        session.Disponibilidade?.Modalidade ||
        'N/A',
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
        Modalidade: true,
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
        modalidade:
          aula.Modalidade?.Descricao ||
          aula.Disponibilidade?.Modalidade ||
          'Sem modalidade',
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
