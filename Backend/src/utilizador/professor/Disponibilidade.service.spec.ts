import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { DispobilidadeService } from './Disponibilidade.service';

describe('DispobilidadeService', () => {
  let service: DispobilidadeService;

  const prismaMock = {
    disponibilidade: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispobilidadeService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DispobilidadeService>(DispobilidadeService);
    jest.resetAllMocks();
  });

  it('deve mapear disponibilidades para o contrato do frontend', async () => {
    const inicio = new Date('2026-05-01T10:00:00.000Z');
    prismaMock.disponibilidade.findMany.mockResolvedValue([
      {
        ID_Disponibilidade: 1,
        Hora_Inicio: inicio,
        Duracao: 60,
        Modalidade: 'Salsa',
        MaxAlunos: 4,
        ID_Professor: 7,
        IdEstudio: 2,
        ValorPorAluno: 25,
        AlteradoPorUtilizadorID: 9,
        Professor: { Pessoa: { Nome: 'Professora Ana' } },
        Estado_Disponibilidade: { Tipo: 'Pendente' },
        Utilizador: { Pessoa: { Nome: 'Coordenadora' } },
        Coaching: [{ Coaching_Aluno: [{ ID_Aluno: 10 }, { ID_Aluno: 11 }] }],
      },
      {
        ID_Disponibilidade: 2,
        Hora_Inicio: null,
        Duracao: 60,
        Coaching: [],
      },
    ]);

    const resultado = await service.getAvailabilities();

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(
      expect.objectContaining({
        idDisponibilidade: 1,
        nomeProfessor: 'Professora Ana',
        modalidade: 'Salsa',
        alunosInscritosIds: [10, 11],
        valorPorAluno: 25,
      }),
    );
  });

  it('deve criar disponibilidade pendente sem estúdio nem valor', async () => {
    const dto = {
      ID_Professor: 7,
      Hora_Inicio: '2026-05-10T10:00:00.000Z',
      AlteradoPorUtilizadorID: 9,
      Duracao: 60,
      Modalidade: 'Salsa',
      MaxAlunos: 4,
    };
    const disponibilidade = { ID_Disponibilidade: 1 };
    prismaMock.disponibilidade.create.mockResolvedValue(disponibilidade);

    await expect(service.criarDisponibilidade(dto)).resolves.toEqual({
      message: 'Disponibilidade criada com sucesso!',
      disponibilidade,
    });
    expect(prismaMock.disponibilidade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        EstadoDisponibilidadeID: 2,
        IdEstudio: null,
        ValorPorAluno: null,
      }),
    });
  });

  it('deve rejeitar criacao de disponibilidade com data anterior a atual', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-03T12:00:00.000Z'));

    try {
      const dto = {
        ID_Professor: 7,
        Hora_Inicio: '2026-05-02T10:00:00.000Z',
        AlteradoPorUtilizadorID: 9,
        Duracao: 60,
        Modalidade: 'Salsa',
        MaxAlunos: 4,
      };

      await expect(service.criarDisponibilidade(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.disponibilidade.create).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('deve atualizar disponibilidade existente e rejeitar inexistente', async () => {
    prismaMock.disponibilidade.count.mockResolvedValueOnce(1);
    prismaMock.disponibilidade.update.mockResolvedValue({
      ID_Disponibilidade: 1,
    });

    await expect(
      service.updateAvailability(1, { EstadoDisponibilidadeID: 1 } as any),
    ).resolves.toEqual({
      message: 'Disponibiliade atualizada com sucesso.',
      disponibilidade: { ID_Disponibilidade: 1 },
    });

    prismaMock.disponibilidade.count.mockResolvedValueOnce(0);
    await expect(service.updateAvailability(2, {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
