import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAulaFixaDto } from './dto/create-aula-fixa.dto';
import { CreateExcecaoAulaFixaDto } from './dto/create-excecao-aula-fixa.dto';
import { UpdateAulaFixaDto } from './dto/update-aula-fixa.dto';

/**
 * Executa a operacao parse time to date.
 * @param time Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

function parseTimeToDate(time: string) {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new BadRequestException('Formato de hora inválido. Use HH:mm.');
  }

  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

/**
 * Executa a operacao normalize date.
 * @param dateString Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

function normalizeDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      'Data inválida. Utilize o formato YYYY-MM-DD.',
    );
  }
  date.setHours(0, 0, 0, 0);
  return date;
}
/**
 * Servico responsavel pela logica de Horarios.
 */

@Injectable()
export class HorariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao get dias semana.
   * @returns Resultado da operacao.
   */

  async getDiasSemana() {
    return this.prisma.dias_Semana.findMany({ orderBy: { ID_Dia: 'asc' } });
  }

  /**
   * Executa a operacao get all horarios.
   * @returns Resultado da operacao.
   */

  async getAllHorarios() {
    return this.prisma.aula_Fixa.findMany({
      orderBy: [{ Dia_Semana: 'asc' }, { Hora_Inicio: 'asc' }],
      include: {
        Dias_Semana: true,
        Sala: true,
        Modalidade: true,
        Utilizador: {
          include: {
            Pessoa: true,
          },
        },
        Excecao_Aula_Fixa: true,
      },
    });
  }

  /**
   * Executa a operacao get horario by id.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getHorarioById(id: number) {
    const horario = await this.prisma.aula_Fixa.findUnique({
      where: { ID_AulaFixa: id },
      include: {
        Dias_Semana: true,
        Sala: true,
        Modalidade: true,
        Utilizador: { include: { Pessoa: true } },
        Excecao_Aula_Fixa: true,
      },
    });

    if (!horario) {
      throw new NotFoundException('Horário fixo não encontrado.');
    }

    return horario;
  }

  /**
   * Executa a operacao resolve professor utilizador id.
   * @param idProfessor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async resolveProfessorUtilizadorId(idProfessor?: number) {
    if (!idProfessor) {
      return null;
    }

    const utilizadorByIdUtilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idProfessor },
    });
    if (utilizadorByIdUtilizador) {
      return utilizadorByIdUtilizador.ID_Utilizador;
    }

    const utilizadorByIdPessoa = await this.prisma.utilizador.findUnique({
      where: { ID_Pessoa: idProfessor },
    });
    if (utilizadorByIdPessoa) {
      return utilizadorByIdPessoa.ID_Utilizador;
    }

    throw new NotFoundException('Professor não encontrado.');
  }

  /**
   * Executa a operacao create horario.
   * @param createAulaFixaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async createHorario(createAulaFixaDto: CreateAulaFixaDto) {
    const horaInicio = parseTimeToDate(createAulaFixaDto.horaInicio);
    const professorUtilizadorId = await this.resolveProfessorUtilizadorId(
      createAulaFixaDto.idProfessor,
    );

    return this.prisma.aula_Fixa.create({
      data: {
        Dia_Semana: createAulaFixaDto.diaSemana,
        Hora_Inicio: horaInicio,
        Duracao: createAulaFixaDto.duracao,
        ID_Estudio: createAulaFixaDto.idEstudio,
        ID_Modalidade: createAulaFixaDto.idModalidade,
        ID_Professor: professorUtilizadorId,
        Descricao: createAulaFixaDto.descricao ?? null,
        Ativa: createAulaFixaDto.ativa ?? true,
      },
    });
  }

  /**
   * Executa a operacao update horario.
   * @param id Dados recebidos para a operacao.
   * @param updateAulaFixaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updateHorario(id: number, updateAulaFixaDto: UpdateAulaFixaDto) {
    const data: Record<string, any> = {};
    if (updateAulaFixaDto.ativa !== undefined) {
      data.Ativa = updateAulaFixaDto.ativa;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    return this.prisma.aula_Fixa.update({
      where: { ID_AulaFixa: id },
      data,
    });
  }

  /**
   * Executa a operacao delete horario.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async deleteHorario(id: number) {
    const horario = await this.prisma.aula_Fixa.findUnique({
      where: { ID_AulaFixa: id },
    });
    if (!horario) {
      throw new NotFoundException('Horário fixo não encontrado.');
    }

    return this.prisma.aula_Fixa.delete({
      where: { ID_AulaFixa: id },
    });
  }

  /**
   * Executa a operacao delete excecao.
   * @param idExcecao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async deleteExcecao(idExcecao: number) {
    const excecao = await this.prisma.excecao_Aula_Fixa.findUnique({
      where: { ID_Excecao: idExcecao },
    });

    if (!excecao) {
      throw new NotFoundException('Exceção não encontrada.');
    }

    return this.prisma.excecao_Aula_Fixa.delete({
      where: { ID_Excecao: idExcecao },
    });
  }

  /**
   * Executa a operacao create excecao.
   * @param id Dados recebidos para a operacao.
   * @param createExcecaoDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async createExcecao(id: number, createExcecaoDto: CreateExcecaoAulaFixaDto) {
    const horario = await this.prisma.aula_Fixa.findUnique({
      where: { ID_AulaFixa: id },
    });

    if (!horario) {
      throw new NotFoundException('Horário fixo não encontrado.');
    }

    const dataCancelada = normalizeDate(createExcecaoDto.dataCancelada);

    const existing = await this.prisma.excecao_Aula_Fixa.findFirst({
      where: {
        ID_AulaFixa: id,
        Data_Cancelada: dataCancelada,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma exceção para essa data.');
    }

    return this.prisma.excecao_Aula_Fixa.create({
      data: {
        ID_AulaFixa: id,
        Data_Cancelada: dataCancelada,
      },
    });
  }
}
