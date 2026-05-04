import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ModalidadeService } from './modalidade.service';

describe('ModalidadeService', () => {
  let service: ModalidadeService;

  const prismaMock = {
    modalidade: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModalidadeService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ModalidadeService>(ModalidadeService);
    jest.resetAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve devolver todas as modalidades', async () => {
      const modalidades = [
        { ID_Modalidade: 1, Descricao: 'Salsa' },
        { ID_Modalidade: 2, Descricao: 'Kizomba' },
      ];

      prismaMock.modalidade.findMany.mockResolvedValue(modalidades);

      await expect(service.findAll()).resolves.toBe(modalidades);
      expect(prismaMock.modalidade.findMany).toHaveBeenCalledWith();
    });
  });

  describe('create', () => {
    it('deve criar uma modalidade usando apenas a descrição recebida', async () => {
      const dto = { Descricao: 'Bachata' };
      const modalidadeCriada = { ID_Modalidade: 3, Descricao: 'Bachata' };

      prismaMock.modalidade.create.mockResolvedValue(modalidadeCriada);

      await expect(service.create(dto)).resolves.toBe(modalidadeCriada);
      expect(prismaMock.modalidade.create).toHaveBeenCalledWith({
        data: {
          Descricao: 'Bachata',
        },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar uma modalidade pelo ID', async () => {
      const dto = { Descricao: 'Salsa Cubana' };
      const modalidadeAtualizada = {
        ID_Modalidade: 1,
        Descricao: 'Salsa Cubana',
      };

      prismaMock.modalidade.update.mockResolvedValue(modalidadeAtualizada);

      await expect(service.update(1, dto)).resolves.toBe(modalidadeAtualizada);
      expect(prismaMock.modalidade.update).toHaveBeenCalledWith({
        where: { ID_Modalidade: 1 },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('deve remover uma modalidade pelo ID', async () => {
      const modalidadeRemovida = { ID_Modalidade: 4, Descricao: 'Tango' };

      prismaMock.modalidade.delete.mockResolvedValue(modalidadeRemovida);

      await expect(service.remove(4)).resolves.toBe(modalidadeRemovida);
      expect(prismaMock.modalidade.delete).toHaveBeenCalledWith({
        where: { ID_Modalidade: 4 },
      });
    });

    it('deve lançar ConflictException quando a modalidade está associada a um estúdio', async () => {
      prismaMock.modalidade.delete.mockRejectedValue({ code: 'P2003' });

      await expect(service.remove(4)).rejects.toThrow(
        new ConflictException(
          'Impossível remover a modalidade pois a mesma está atribuída a um estúdio.',
        ),
      );
    });

    it('deve propagar erros Prisma que não sejam conflito de chave estrangeira', async () => {
      const erro = new Error('Erro inesperado');
      prismaMock.modalidade.delete.mockRejectedValue(erro);

      await expect(service.remove(4)).rejects.toBe(erro);
    });
  });
});
