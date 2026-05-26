import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisponibilidadeDto } from '../dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from '../dto/update-disponibilidade.dto';

/**
 * Servico responsavel pela logica de Dispobilidade.
 */

@Injectable()
export class DispobilidadeService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(DispobilidadeService.name);

  /**
   * Executa a operacao get availabilities.
   * @returns Resultado da operacao.
   */

  async getAvailabilities() {
    const disponibilidadesRaw = await this.prisma.disponibilidade.findMany({
      orderBy: [{ Dia_Semana: 'asc' }, { Hora_Inicio: 'asc' }],
      include: {
        Professor: {
          include: {
            Pessoa: true,
            Professor_Modalidade: { include: { Modalidade: true } },
          },
        },
        Estado_Disponibilidade: true,
        Utilizador: { include: { Pessoa: true } },
        Dias_Semana: true,
        Excecao_Disponibilidade: true,

        Coaching: {
          include: {
            Coaching_Aluno: {
              select: { ID_Aluno: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Disponibilidades carregadas total=${disponibilidadesRaw.length}`,
    );

    return disponibilidadesRaw
      .map((disp) => {
        if (disp.Hora_Inicio === null || disp.Duracao === null) {
          return null;
        }

        const horaInicio = new Date(disp.Hora_Inicio);
        const horaFim = new Date(horaInicio.getTime() + disp.Duracao * 60000);

        /**
         * Executa a operacao format hora.
         * @param data Dados recebidos para a operacao.
         * @returns Resultado da operacao.
         */

        const formatHora = (data: Date) =>
          data.toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit',
          });
        const stringHorario = `${formatHora(horaInicio)} - ${formatHora(horaFim)}`;

        const strindData = horaInicio.toLocaleDateString('pt-PT');

        const alunosJaInscritos = disp.Coaching.flatMap((coaching) =>
          coaching.Coaching_Aluno.map((ca) => ca.ID_Aluno),
        );

        const sessoes = disp.Coaching.map((coaching) => ({
          idCoaching: coaching.ID_Coaching,
          inicioCoaching: coaching.Inicio_Coaching,
          idModalidade: coaching.ID_Modalidade,
          alunosInscritosIds: coaching.Coaching_Aluno.map(
            (ca) => ca.ID_Aluno,
          ),
        }));

        return {
          idDisponibilidade: disp.ID_Disponibilidade,
          nomeProfessor:
            disp.Professor?.Pessoa?.Nome || 'Professor Desconhecido',
          data: strindData,
          horario: stringHorario,
          modalidade: disp.Modalidade,
          modalidadesProfessor:
            disp.Professor?.Professor_Modalidade.map((item) => ({
              idModalidade: item.ID_Modalidade,
              descricao: item.Modalidade.Descricao,
            })) ?? [],
          alteradoPor: disp.Utilizador?.Pessoa?.Nome || 'Sistema',
          estado: disp.Estado_Disponibilidade?.Tipo || 'Desconhecido',
          duracao: disp.Duracao,
          maxAlunos: disp.MaxAlunos,
          idProfessor: disp.ID_Professor,
          idEstudio: disp.IdEstudio,
          valorPorAluno: disp.ValorPorAluno ? Number(disp.ValorPorAluno) : 0,
          idCoordenador: disp.AlteradoPorUtilizadorID,
          horaInicio: disp.Hora_Inicio,
          diaSemana: disp.Dia_Semana,
          ativa: disp.Ativa ?? true,
          diasSemana: disp.Dias_Semana,
          excecoes: disp.Excecao_Disponibilidade,
          sessoes,
          alunosInscritosIds: alunosJaInscritos,
        };
      })
      .filter((item) => item !== null);
  }

  /**
   * Executa a operacao criar disponibilidade.
   * @param dto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarDisponibilidade(dto: CreateDisponibilidadeDto) {
    this.logger.log('A criar disponibilidade...');

    const now = new Date();
    const horaInicio = new Date(dto.Hora_Inicio);
    const isRecorrente = dto.Dia_Semana !== undefined && dto.Dia_Semana !== null;

    if (!isRecorrente && horaInicio < now) {
      this.logger.warn(
        `Criacao de disponibilidade rejeitada: data no passado idProfessor=${dto.ID_Professor} horaInicio=${dto.Hora_Inicio}`,
      );
      throw new BadRequestException(
        'Nao é possivel criar disponibilidades com data/hora anterior á atual.',
      );
    }

    const novaDisponibilidade = await this.prisma.disponibilidade.create({
      data: {
        ID_Professor: dto.ID_Professor,
        Hora_Inicio: horaInicio,
        EstadoDisponibilidadeID: 2,
        DataAtualizacao: now,
        AlteradoPorUtilizadorID: dto.AlteradoPorUtilizadorID,
        Duracao: dto.Duracao,
        Modalidade: null,
        IdEstudio: null,
        MaxAlunos: null,
        ValorPorAluno: null,
        Dia_Semana: dto.Dia_Semana ?? null,
        Ativa: dto.Ativa ?? true,
      },
    });
    this.logger.log(
      `Disponibilidade criada idDisponibilidade=${novaDisponibilidade.ID_Disponibilidade} idProfessor=${dto.ID_Professor} horaInicio=${horaInicio.toISOString()} duracao=${dto.Duracao}`,
    );

    return {
      message: 'Disponibilidade criada com sucesso!',
      disponibilidade: novaDisponibilidade,
    };
  }

  /**
   * Executa a operacao update availability.
   * @param idDisponibilidade Dados recebidos para a operacao.
   * @param updateDisponibilidadeDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updateAvailability(
    idDisponibilidade: number,
    updateDisponibilidadeDto: UpdateDisponibilidadeDto,
  ) {
    if (
      (await this.prisma.disponibilidade.count({
        where: { ID_Disponibilidade: idDisponibilidade },
      })) === 0
    ) {
      this.logger.warn(
        `Atualizacao de disponibilidade rejeitada: idDisponibilidade=${idDisponibilidade} inexistente`,
      );
      throw new BadRequestException(
        `A disponibilidade com ID ${idDisponibilidade} não existe.`,
      );
    }

    if (
      updateDisponibilidadeDto.ValorPorAluno !== undefined &&
      updateDisponibilidadeDto.ValorPorAluno < 0
    ) {
      throw new BadRequestException(
        'O valor por aluno não pode ser negativo.',
      );
    }

    const atualizaDisponibilidade = await this.prisma.disponibilidade.update({
      where: {
        ID_Disponibilidade: idDisponibilidade,
      },

      data: {
        ...updateDisponibilidadeDto,
        DataAtualizacao: new Date(),
      },
    });
    this.logger.log(
      `Disponibilidade atualizada idDisponibilidade=${idDisponibilidade}`,
    );

    return {
      message: 'Disponibiliade atualizada com sucesso.',
      disponibilidade: atualizaDisponibilidade,
    };
  }

  async deleteAvailability(idDisponibilidade: number) {
    this.logger.log(
      `A eliminar disponibilidade idDisponibilidade=${idDisponibilidade}`,
    );

    const disponibilidade = await this.prisma.disponibilidade.findUnique({
      where: { ID_Disponibilidade: idDisponibilidade },
    });

    if (!disponibilidade) {
      throw new NotFoundException('Disponibilidade nao encontrada.');
    }

    const removida = await this.prisma.disponibilidade.delete({
      where: { ID_Disponibilidade: idDisponibilidade },
    });

    return {
      message: 'Disponibilidade eliminada com sucesso.',
      disponibilidade: removida,
    };
  }

  async createExcecao(idDisponibilidade: number, dataCanceladaRaw: string) {
    const disponibilidade = await this.prisma.disponibilidade.findUnique({
      where: { ID_Disponibilidade: idDisponibilidade },
    });

    if (!disponibilidade) {
      throw new NotFoundException('Disponibilidade nao encontrada.');
    }

    const dataCancelada = new Date(dataCanceladaRaw);
    if (Number.isNaN(dataCancelada.getTime())) {
      throw new BadRequestException('Data invalida. Utilize o formato YYYY-MM-DD.');
    }
    dataCancelada.setHours(0, 0, 0, 0);

    const existente = await this.prisma.excecao_Disponibilidade.findFirst({
      where: {
        ID_Disponibilidade: idDisponibilidade,
        Data_Cancelada: dataCancelada,
      },
    });

    if (existente) {
      throw new BadRequestException('Ja existe uma excecao para essa data.');
    }

    const excecao = await this.prisma.excecao_Disponibilidade.create({
      data: {
        ID_Disponibilidade: idDisponibilidade,
        Data_Cancelada: dataCancelada,
      },
    });

    return {
      message: 'Excecao criada com sucesso.',
      excecao,
    };
  }

  async deleteExcecao(idExcecao: number) {
    const excecao = await this.prisma.excecao_Disponibilidade.findUnique({
      where: { ID_Excecao: idExcecao },
    });

    if (!excecao) {
      throw new NotFoundException('Excecao nao encontrada.');
    }

    const removida = await this.prisma.excecao_Disponibilidade.delete({
      where: { ID_Excecao: idExcecao },
    });

    return {
      message: 'Excecao removida com sucesso.',
      excecao: removida,
    };
  }
}
