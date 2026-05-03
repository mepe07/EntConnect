import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ProfessorService } from './professor.service';

describe('ProfessorService', () => {
  let service: ProfessorService;

  const prismaMock = {
    professor: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pessoa: {
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessorService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProfessorService>(ProfessorService);
    jest.resetAllMocks();
  });

  it('deve criar professor com pessoa associada', async () => {
    const dto = {
      Nome: 'Ana',
      Email: 'ana@email.test',
      Data_Nascimento: '1990-01-01',
      NIF: '123456789',
      Contacto: '910000000',
      Foto: 'foto.jpg',
    };
    prismaMock.professor.create.mockResolvedValue({ ID_Pessoa: 1 });

    await expect(service.create(dto)).resolves.toEqual({ ID_Pessoa: 1 });
    expect(prismaMock.professor.create).toHaveBeenCalledWith({
      data: {
        Pessoa: {
          create: expect.objectContaining({
            Nome: 'Ana',
            Email: 'ana@email.test',
            Data_Nascimento: expect.any(Date),
          }),
        },
      },
      include: { Pessoa: true },
    });
  });

  it('deve converter conflito de criação em ConflictException', async () => {
    prismaMock.professor.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.create({} as any)).rejects.toThrow(ConflictException);
  });

  it('deve listar professores paginados', async () => {
    prismaMock.professor.findMany.mockResolvedValue([{ ID_Pessoa: 1 }]);
    prismaMock.professor.count.mockResolvedValue(21);

    await expect(service.findAll(2)).resolves.toEqual({
      data: [{ ID_Pessoa: 1 }],
      meta: { total: 21, page: 2, lastPage: 2 },
    });
    expect(prismaMock.professor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 20 }),
    );
  });

  it('deve atualizar professor e tratar conflito', async () => {
    prismaMock.professor.update.mockResolvedValueOnce({ ID_Pessoa: 1 });

    await expect(service.update(1, { Nome: 'Ana 2', Data_Nascimento: '1990-01-01' } as any)).resolves.toEqual({ ID_Pessoa: 1 });

    prismaMock.professor.update.mockRejectedValueOnce({ code: 'P2002' });
    await expect(service.update(1, {} as any)).rejects.toThrow(ConflictException);
  });

  it('deve remover professor e pessoa associada', async () => {
    prismaMock.professor.delete.mockResolvedValue({ ID_Pessoa: 1 });

    await expect(service.remove(1)).resolves.toEqual({ ID_Pessoa: 1 });
    expect(prismaMock.professor.delete).toHaveBeenCalledWith({ where: { ID_Pessoa: 1 } });
    expect(prismaMock.pessoa.delete).toHaveBeenCalledWith({ where: { ID_Pessoa: 1 } });
  });

  it('deve converter erros Prisma conhecidos ao remover', async () => {
    prismaMock.professor.delete.mockRejectedValueOnce({ code: 'P2025' });
    await expect(service.remove(1)).rejects.toThrow(NotFoundException);

    prismaMock.professor.delete.mockRejectedValueOnce({ code: 'P2003' });
    await expect(service.remove(1)).rejects.toThrow(ConflictException);
  });
});
