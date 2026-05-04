import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SalasService } from './salas.service';

describe('SalasService', () => {
  let service: SalasService;

  const prismaMock = {
    sala: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
    jest.resetAllMocks();
  });

  it('deve criar sala e mapear modalidade', async () => {
    prismaMock.sala.create.mockResolvedValue({
      ID_Sala: 1,
      Nome: 'Estúdio A',
      Disponivel: true,
      Modalidade: { Descricao: 'Salsa' },
    });

    await expect(
      service.create({ nome: 'Estúdio A', disponivel: true, modalidade: '2' }),
    ).resolves.toEqual({
      ID_Sala: 1,
      Nome: 'Estúdio A',
      Disponivel: true,
      Modalidade: 'Salsa',
    });
  });

  it('deve listar salas formatadas', async () => {
    prismaMock.sala.findMany.mockResolvedValue([
      { ID_Sala: 1, Nome: 'Estúdio A', Disponivel: true, Modalidade: null },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        ID_Sala: 1,
        Nome: 'Estúdio A',
        Disponivel: true,
        Modalidade: 'Sem Modalidade',
      },
    ]);
  });

  it('deve atualizar sala e remover sala', async () => {
    prismaMock.sala.update.mockResolvedValue({
      ID_Sala: 1,
      Nome: 'Estúdio B',
      Disponivel: false,
      Modalidade: { Descricao: 'Kizomba' },
    });
    prismaMock.sala.delete.mockResolvedValue({ ID_Sala: 1 });

    await expect(
      service.update(1, {
        nome: 'Estúdio B',
        disponivel: 'false',
        modalidade: '3',
      }),
    ).resolves.toEqual({
      ID_Sala: 1,
      Nome: 'Estúdio B',
      Disponivel: false,
      Modalidade: 'Kizomba',
    });
    await expect(service.remove(1)).resolves.toEqual({ ID_Sala: 1 });
  });
});
