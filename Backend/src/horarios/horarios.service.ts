import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAulaFixaDto } from './dto/create-aula-fixa.dto';
import { CreateExcecaoAulaFixaDto } from './dto/create-excecao-aula-fixa.dto';
import { UpdateAulaFixaDto } from './dto/update-aula-fixa.dto';

/**
 * Converte uma hora `HH:mm` para um objeto `Date` técnico.
 *
 * @param time - Hora no formato `HH:mm`.
 * @returns Data auxiliar com a hora convertida.
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
 * Normaliza uma data para o início do dia.
 *
 * @param dateString - Data recebida como texto.
 * @returns Data normalizada para `00:00:00.000`.
 */
function normalizeDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data inválida. Utilize o formato YYYY-MM-DD.');
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
/**
 * Serviço responsável pela gestão de horários fixos e exceções.
 */
export class HorariosService {
  constructor(private readonly prisma: PrismaService) {}

  async getDiasSemana() {
    return this.prisma.dias_Semana.findMany({ orderBy: { ID_Dia: 'asc' } });
  }

  async getAllHorarios() {
    return this.prisma.aula_Fixa.findMany({
      orderBy: [
        { Dia_Semana: 'asc' },
        { Hora_Inicio: 'asc' },
      ],
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

  async createHorario(createAulaFixaDto: CreateAulaFixaDto) {
    const horaInicio = parseTimeToDate(createAulaFixaDto.horaInicio);
    const professorUtilizadorId = await this.resolveProfessorUtilizadorId(createAulaFixaDto.idProfessor);

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

  async deleteHorario(id: number) {
    // 1. Verifica se existe
    const horario = await this.prisma.aula_Fixa.findUnique({ where: { ID_AulaFixa: id } });
    if (!horario) {
      throw new NotFoundException('Horário fixo não encontrado.');
    }

    return this.prisma.aula_Fixa.delete({
      where: { ID_AulaFixa: id },
    });
  }

  async deleteExcecao(idExcecao: number) {
    const excecao = await this.prisma.excecao_Aula_Fixa.findUnique({ where: { ID_Excecao: idExcecao } });
    
    if (!excecao) {
      throw new NotFoundException('Exceção não encontrada.');
    }

    return this.prisma.excecao_Aula_Fixa.delete({
      where: { ID_Excecao: idExcecao },
    });
  }

  async createExcecao(id: number, createExcecaoDto: CreateExcecaoAulaFixaDto) {
    const horario = await this.prisma.aula_Fixa.findUnique({ where: { ID_AulaFixa: id } });

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
