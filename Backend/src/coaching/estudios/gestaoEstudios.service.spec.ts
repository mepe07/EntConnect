import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { GestaoEstudiosService } from './gestaoEstudios.service';

describe('GestaoEstudiosService', () => {
  let service: GestaoEstudiosService;

  const prismaMock = {
    sala: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GestaoEstudiosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<GestaoEstudiosService>(GestaoEstudiosService);
    jest.resetAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getAllStudios', () => {
    it('deve devolver todas as salas registadas', async () => {
      const salas = [
        { ID_Sala: 1, Nome: 'Estúdio A', Disponivel: true },
        { ID_Sala: 2, Nome: 'Estúdio B', Disponivel: false },
      ];

      prismaMock.sala.findMany.mockResolvedValue(salas);

      await expect(service.getAllStudios()).resolves.toBe(salas);
      expect(prismaMock.sala.findMany).toHaveBeenCalledWith();
    });
  });

  describe('lockStudio', () => {
    it('deve bloquear um estúdio disponível', async () => {
      const studio = { ID_Sala: 1, Nome: 'Estúdio A', Disponivel: true };
      const updatedStudio = { ...studio, Disponivel: false };

      prismaMock.sala.findUnique.mockResolvedValue(studio);
      prismaMock.sala.update.mockResolvedValue(updatedStudio);

      await expect(service.lockStudio(1)).resolves.toEqual({
        message: "Estúdio 'Estúdio A' bloqueado com sucesso.",
        studio: updatedStudio,
      });

      expect(prismaMock.sala.findUnique).toHaveBeenCalledWith({
        where: { ID_Sala: 1 },
      });
      expect(prismaMock.sala.update).toHaveBeenCalledWith({
        where: { ID_Sala: 1 },
        data: { Disponivel: false },
      });
    });

    it('deve lançar NotFoundException quando o estúdio não existe', async () => {
      prismaMock.sala.findUnique.mockResolvedValue(null);

      await expect(service.lockStudio(99)).rejects.toThrow(
        new NotFoundException('Estúdio com ID 99 não encontrado.'),
      );
      expect(prismaMock.sala.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando o estúdio já está bloqueado', async () => {
      prismaMock.sala.findUnique.mockResolvedValue({
        ID_Sala: 1,
        Nome: 'Estúdio A',
        Disponivel: false,
      });

      await expect(service.lockStudio(1)).rejects.toThrow(
        new BadRequestException('Estúdio com ID 1 já está bloqueado.'),
      );
      expect(prismaMock.sala.update).not.toHaveBeenCalled();
    });
  });

  describe('unlockStudio', () => {
    it('deve desbloquear um estúdio bloqueado', async () => {
      const studio = { ID_Sala: 2, Nome: 'Estúdio B', Disponivel: false };
      const updatedStudio = { ...studio, Disponivel: true };

      prismaMock.sala.findUnique.mockResolvedValue(studio);
      prismaMock.sala.update.mockResolvedValue(updatedStudio);

      await expect(service.unlockStudio(2)).resolves.toEqual({
        message: "Estúdio 'Estúdio B' desbloqueado com sucesso.",
        studio: updatedStudio,
      });

      expect(prismaMock.sala.findUnique).toHaveBeenCalledWith({
        where: { ID_Sala: 2 },
      });
      expect(prismaMock.sala.update).toHaveBeenCalledWith({
        where: { ID_Sala: 2 },
        data: { Disponivel: true },
      });
    });

    it('deve lançar NotFoundException quando o estúdio não existe', async () => {
      prismaMock.sala.findUnique.mockResolvedValue(null);

      await expect(service.unlockStudio(99)).rejects.toThrow(
        new NotFoundException('Estúdio com ID 99 não encontrado.'),
      );
      expect(prismaMock.sala.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando o estúdio já está desbloqueado', async () => {
      prismaMock.sala.findUnique.mockResolvedValue({
        ID_Sala: 2,
        Nome: 'Estúdio B',
        Disponivel: true,
      });

      await expect(service.unlockStudio(2)).rejects.toThrow(
        new BadRequestException('Estúdio com ID 2 já está desbloqueado.'),
      );
      expect(prismaMock.sala.update).not.toHaveBeenCalled();
    });
  });
});
