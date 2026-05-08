import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
    this.logger.log('A carregar todas as disponibilidades da Base de Dados...');
    const disponibilidadesRaw = await this.prisma.disponibilidade.findMany({
      include: {
        Professor: { include: { Pessoa: true } },
        Estado_Disponibilidade: true,
        Utilizador: { include: { Pessoa: true } },

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

        return {
          idDisponibilidade: disp.ID_Disponibilidade,
          nomeProfessor:
            disp.Professor?.Pessoa?.Nome || 'Professor Desconhecido',
          data: strindData,
          horario: stringHorario,
          modalidade: disp.Modalidade,
          alteradoPor: disp.Utilizador?.Pessoa?.Nome || 'Sistema',
          estado: disp.Estado_Disponibilidade?.Tipo || 'Desconhecido',
          duracao: disp.Duracao,
          maxAlunos: disp.MaxAlunos,
          idProfessor: disp.ID_Professor,
          idEstudio: disp.IdEstudio,
          valorPorAluno: disp.ValorPorAluno ? Number(disp.ValorPorAluno) : 0,
          idCoordenador: disp.AlteradoPorUtilizadorID,
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
    const horaInicio = new Date(dto.Hora_Inicio);
    const inicioDoDiaAtual = new Date();
    inicioDoDiaAtual.setHours(0, 0, 0, 0);

    const diaDisponibilidade = new Date(horaInicio);
    diaDisponibilidade.setHours(0, 0, 0, 0);

    if (diaDisponibilidade < inicioDoDiaAtual) {
      this.logger.warn(
        `Criacao de disponibilidade rejeitada: data no passado idProfessor=${dto.ID_Professor} horaInicio=${dto.Hora_Inicio}`,
      );
      throw new BadRequestException(
        'Nao e possivel criar disponibilidades com data anterior a data atual.',
      );
    }

    const novaDisponibilidade = await this.prisma.disponibilidade.create({
      data: {
        ID_Professor: dto.ID_Professor,
        Hora_Inicio: horaInicio,
        EstadoDisponibilidadeID: 2,
        DataAtualizacao: new Date(),
        AlteradoPorUtilizadorID: dto.AlteradoPorUtilizadorID,
        Duracao: dto.Duracao,
        Modalidade: dto.Modalidade,
        IdEstudio: null,
        MaxAlunos: dto.MaxAlunos,
        ValorPorAluno: null,
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
}
