import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DispobilidadeService } from './Disponibilidade.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { mock } from 'node:test';

describe('DisponibilidadeService - criarDisponibilidade', () => {
    let disponibilidadeService: DispobilidadeService;
    let prismaService: PrismaService;

    // Mock Prisma
    const mockPrismaService = {
        disponibilidade: {
            create: jest.fn(),
        }
    };

    // Configuração do módulo de teste
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DispobilidadeService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        disponibilidadeService = module.get<DispobilidadeService>(DispobilidadeService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    // Limpar os mocks depois de cada testes
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('criarDisponibilidade', () => {

        it('deve retornar erro se o dia da disponibilidade for inferior ao dia atual', async () => {

            // Arrange
            const mockBody = {
                ID_Professor: 1,
                Hora_Inicio: "2020-05-09T09:00:00Z",
                EstadoDisponibilidadeID: 2,
                AlteradoPorUtilizadorID: 3,
                Duracao: 60,
                Modalidade: "teste",
                IdEstudio: 12,
                MaxAlunos: 10,
                ValorPorAluno: 40,
            };

            // Act
            const action = disponibilidadeService.criarDisponibilidade(mockBody);

            // Assert
            await expect(action).rejects.toThrow('Nao e possivel criar disponibilidades com data anterior a data atual.');

            expect(prismaService.disponibilidade.create).not.toHaveBeenCalled();
        });

    });

});