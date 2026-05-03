import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { PrismaService } from '../prisma/prisma.service'; // Importa o PrismaService para interagir com a DB

@Injectable()
export class CoachingService {

  constructor(private readonly prisma: PrismaService) { } // Injeta o PrismaService no construtor


  async create(createCoachingDto: CreateCoachingDto) {
    // Usa o Prisma para criar um novo registo de coaching na DB
    return this.prisma.coaching.create({
      data: createCoachingDto, // Os dados para criar o coaching vêm do DTO
    });
  }


  async inscreverAluno(idDisponibilidade: number, body: any) {

    const disponibilidadeInfo = await this.prisma.disponibilidade.findUnique({
      where: { ID_Disponibilidade: idDisponibilidade },
      select: { MaxAlunos: true }
    });

    if (!disponibilidadeInfo || (disponibilidadeInfo.MaxAlunos ?? 0) <= 0) {
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
      })
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
        ID_Disponibilidade: idDisponibilidade
      },
      data: {
        MaxAlunos: {
          decrement: 1 // Diminiu 1 vaga
        }
      }
    });

    return {
      message: 'Aluno inscrito com sucesso!',
      inscricao: novaInscricao
    };

  }

  /**
   * Anular inscricao de aluno
   */
  async removerAluno(idAluno: number, idCoaching: number) {

    let coachingAluno = await this.prisma.coaching_Aluno.findFirst({
      where: {
        ID_Aluno: idAluno,
        ID_Coaching: idCoaching,
      },
    })

    if (!coachingAluno) {
      throw new Error('Inscrição não encontrada!');
    }

    // Descobrir o ID da disponibilidade para poder atualizar as vagas
    const coaching = await this.prisma.coaching.findUnique({
      where: { ID_Coaching: idCoaching },
      select: { ID_Disponibilidade: true }
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
        }
      },
    });

    if (coaching && coaching.ID_Disponibilidade) {
      await this.prisma.disponibilidade.update({
        where: {
          ID_Disponibilidade: coaching.ID_Disponibilidade
        },
        data: {
          MaxAlunos: {
            increment: 1 // Aumentar as vagas da disponibilidade
          }
        }
      });
    }

    if (totalInscritos == 1) {
      await this.prisma.coaching.delete({
        where: {
          ID_Coaching: idCoaching,
        },
      });
    }

    return { message: 'Aluno removido com sucesso!' };
  }

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

    return futureSessions.map(session => ({
      idCoaching: session.ID_Coaching,
      nomeProfessor: session.Professor?.Pessoa?.Nome || 'N/A',
      data: session.Inicio_Coaching ? session.Inicio_Coaching.toLocaleDateString('pt-PT') : 'N/A',
      horario: session.Inicio_Coaching && session.Duracao
        ? `${session.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${(new Date(session.Inicio_Coaching.getTime() + session.Duracao * 60000)).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
        : 'N/A',
      modalidade: session.Disponibilidade?.Modalidade || 'N/A',
      estado: session.Estado_Coaching?.Tipo || 'N/A',
      alunos: session.Coaching_Aluno.map(ca => ({
        idAluno: ca.ID_Aluno,
        nome: ca.Aluno.Nome,
      })),
    }));
  }

  async getKpisAdmin() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const next24h = new Date(now);
    next24h.setHours(next24h.getHours() + 24);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Próximas 24h
    const proximas24h = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          gte: now,
          lte: next24h,
        },
      },
    });

    // Sessões marcadas (futuras)
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

    // Realizadas no mês
    const realizadasMes = await this.prisma.coaching.count({
      where: {
        Inicio_Coaching: {
          gte: monthStart,
          lte: monthEnd,
        },
        Estado_Coaching: {
          Tipo: 'Realizada', // Assumindo que existe este estado
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
      dataNascimento: aluno.Data_Nascimento?.toISOString().split('T')[0] ?? null,
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
     * Obtém as marcações de Coaching (Agenda pura, sem faturação)
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
      const nomesAlunos = aula.Coaching_Aluno
        .map(ligacao => ligacao.Aluno?.Nome)
        .filter(nome => nome !== undefined);

      return {
        idCoaching: aula.ID_Coaching,
        dataInicio: aula.Inicio_Coaching,
        duracaoMinutos: aula.Duracao,
        sala: aula.Sala?.Nome || 'Sem sala atribuída',
        modalidade: aula.Disponibilidade?.Modalidade || 'Sem modalidade',
        alunos: nomesAlunos,
        totalAlunos: nomesAlunos.length,
        estado: aula.Estado_Coaching?.Tipo || 'Pendente',
        confirmacao_prof: aula.confirmacao_prof
      };
    });
}

  /**
   * Lógica para confirmação da sessão pelo Professor
   */
  async confirmarSessaoProfessor(idCoaching: number) {
    // 1. Verificar se a sessão existe
    const sessao = await this.prisma.coaching.findUnique({
      where: { ID_Coaching: idCoaching },
    });

    if (!sessao) {
      throw new NotFoundException(`Sessão de coaching com ID ${idCoaching} não encontrada.`);
    }

    // 2. Validar se a sessão já começou (não se pode confirmar o futuro)
    const agora = new Date();
    const dataInicio = new Date(sessao.Inicio_Coaching!);

    if (agora < dataInicio) {
      throw new BadRequestException(
        'Não pode confirmar uma sessão que ainda não se iniciou.'
      );
    }

    // 3. Verificar se já está concluída (Estado 13) para evitar updates desnecessários
    if (sessao.ID_Estado_Coaching === 13) {
      throw new BadRequestException('Esta sessão já se encontra concluída.');
    }

    // 4. Determinar o novo estado
    let novoEstado = sessao.ID_Estado_Coaching;

    // Como confirmacao_EE é booleano no Prisma:
    if (sessao.confirmacao_EE === true) {
      novoEstado = 13;
    }

    // 5. Atualizar a Base de Dados
    return this.prisma.coaching.update({
      where: { ID_Coaching: idCoaching },
      data: {
        confirmacao_prof: true, // Usa true (booleano) em vez de 1
        ID_Estado_Coaching: novoEstado,
      },
    });
  }

}

