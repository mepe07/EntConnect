import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { HorariosService } from './horarios.service';

describe('HorariosService', () => {
  let service: HorariosService;

  const prismaMock = {
    dias_Semana: { findMany: jest.fn() },
    aula_Fixa: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    utilizador: { findUnique: jest.fn() },
    excecao_Aula_Fixa: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HorariosService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<HorariosService>(HorariosService);
    jest.resetAllMocks();
  });

  it('deve listar dias da semana por ID', async () => {
    const dias = [{ ID_Dia: 1, Nome_Dia: 'Segunda' }];
    prismaMock.dias_Semana.findMany.mockResolvedValue(dias);

    await expect(service.getDiasSemana()).resolves.toBe(dias);
    expect(prismaMock.dias_Semana.findMany).toHaveBeenCalledWith({ orderBy: { ID_Dia: 'asc' } });
  });

  it('deve listar horários fixos com relações', async () => {
    const horarios = [{ ID_AulaFixa: 1 }];
    prismaMock.aula_Fixa.findMany.mockResolvedValue(horarios);

    await expect(service.getAllHorarios()).resolves.toBe(horarios);
    expect(prismaMock.aula_Fixa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ Dia_Semana: 'asc' }, { Hora_Inicio: 'asc' }],
        include: expect.objectContaining({ Sala: true, Modalidade: true }),
      }),
    );
  });

  it('deve obter horário por ID ou lançar NotFound', async () => {
    prismaMock.aula_Fixa.findUnique.mockResolvedValueOnce({ ID_AulaFixa: 1 });
    await expect(service.getHorarioById(1)).resolves.toEqual({ ID_AulaFixa: 1 });

    prismaMock.aula_Fixa.findUnique.mockResolvedValueOnce(null);
    await expect(service.getHorarioById(99)).rejects.toThrow(NotFoundException);
  });

  it('deve criar horário resolvendo professor por ID de utilizador', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValueOnce({ ID_Utilizador: 10 });
    prismaMock.aula_Fixa.create.mockResolvedValue({ ID_AulaFixa: 1 });

    await service.createHorario({
      diaSemana: 1,
      horaInicio: '09:30',
      duracao: 60,
      idEstudio: 2,
      idModalidade: 3,
      idProfessor: 10,
      ativa: true,
    });

    expect(prismaMock.aula_Fixa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Hora_Inicio: expect.any(Date),
        ID_Professor: 10,
        ID_Estudio: 2,
        ID_Modalidade: 3,
      }),
    });
  });

  it('deve rejeitar criação com hora inválida ou professor inexistente', async () => {
    await expect(service.createHorario({
      diaSemana: 1,
      horaInicio: '25:00',
      duracao: 60,
      idEstudio: 2,
      idModalidade: 3,
    })).rejects.toThrow(BadRequestException);

    prismaMock.utilizador.findUnique.mockResolvedValue(null);
    await expect(service.createHorario({
      diaSemana: 1,
      horaInicio: '09:00',
      duracao: 60,
      idEstudio: 2,
      idModalidade: 3,
      idProfessor: 999,
    })).rejects.toThrow(NotFoundException);
  });

  it('deve atualizar apenas campos permitidos e rejeitar payload vazio', async () => {
    prismaMock.aula_Fixa.update.mockResolvedValue({ ID_AulaFixa: 1, Ativa: false });

    await expect(service.updateHorario(1, { ativa: false })).resolves.toEqual({ ID_AulaFixa: 1, Ativa: false });
    expect(prismaMock.aula_Fixa.update).toHaveBeenCalledWith({
      where: { ID_AulaFixa: 1 },
      data: { Ativa: false },
    });

    await expect(service.updateHorario(1, {})).rejects.toThrow(BadRequestException);
  });

  it('deve apagar horário existente e rejeitar inexistente', async () => {
    prismaMock.aula_Fixa.findUnique.mockResolvedValueOnce({ ID_AulaFixa: 1 });
    prismaMock.aula_Fixa.delete.mockResolvedValue({ ID_AulaFixa: 1 });

    await expect(service.deleteHorario(1)).resolves.toEqual({ ID_AulaFixa: 1 });

    prismaMock.aula_Fixa.findUnique.mockResolvedValueOnce(null);
    await expect(service.deleteHorario(2)).rejects.toThrow(NotFoundException);
  });

  it('deve criar exceção quando não existe duplicada', async () => {
    prismaMock.aula_Fixa.findUnique.mockResolvedValue({ ID_AulaFixa: 1 });
    prismaMock.excecao_Aula_Fixa.findFirst.mockResolvedValue(null);
    prismaMock.excecao_Aula_Fixa.create.mockResolvedValue({ ID_Excecao: 3 });

    await expect(service.createExcecao(1, { dataCancelada: '2026-05-10' })).resolves.toEqual({ ID_Excecao: 3 });
    expect(prismaMock.excecao_Aula_Fixa.create).toHaveBeenCalledWith({
      data: { ID_AulaFixa: 1, Data_Cancelada: expect.any(Date) },
    });
  });

  it('deve rejeitar exceção duplicada, data inválida e apagar exceção inexistente', async () => {
    prismaMock.aula_Fixa.findUnique.mockResolvedValue({ ID_AulaFixa: 1 });
    await expect(service.createExcecao(1, { dataCancelada: 'data-invalida' })).rejects.toThrow(BadRequestException);

    prismaMock.excecao_Aula_Fixa.findFirst.mockResolvedValue({ ID_Excecao: 3 });
    await expect(service.createExcecao(1, { dataCancelada: '2026-05-10' })).rejects.toThrow(BadRequestException);

    prismaMock.excecao_Aula_Fixa.findUnique.mockResolvedValue(null);
    await expect(service.deleteExcecao(3)).rejects.toThrow(NotFoundException);
  });
});
