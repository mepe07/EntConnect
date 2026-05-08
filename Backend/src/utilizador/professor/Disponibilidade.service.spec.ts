import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DispobilidadeService } from './Disponibilidade.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DisponibilidadeService - criarDisponibilidade', () => {
    let disponibilidadeService: DispobilidadeService;
    let prismaService: PrismaService;

    // Mock Prisma
    const mockPrismaService = {
        disponibilidade: {
            create: jest.fn<() => Promise<any>>(),
            count: jest.fn<() => Promise<any>>(),
            update: jest.fn<() => Promise<any>>(),
        },
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
            // const action = disponibilidadeService.criarDisponibilidade(mockBody);
            const action = disponibilidadeService.criarDisponibilidade(mockBody as any);

            // Assert
            await expect(action).rejects.toThrow('Nao é possivel criar disponibilidades com data/hora anterior á atual.');

            expect(prismaService.disponibilidade.create).not.toHaveBeenCalled();
        });



        it('deve criar disponibilidade quando a data for futura', async () => {

            // Arrange
            const mockBody = {
                ID_Professor: 1,
                Hora_Inicio: '2099-05-09T09:00:00Z',
                AlteradoPorUtilizadorID: 3,
                Duracao: 60,
                Modalidade: 'Ballet',
                MaxAlunos: 10,
            };

            const mockDisponibilidadeCriada = {
                ID_Disponibilidade: 99,
                ID_Professor: 1,
                Hora_Inicio: new Date(mockBody.Hora_Inicio),
                EstadoDisponibilidadeID: 2,
                AlteradoPorUtilizadorID: 3,
                Duracao: 60,
                Modalidade: 'Ballet',
                IdEstudio: null,
                MaxAlunos: 10,
                ValorPorAluno: null,
                DataAtualizacao: new Date(),
            };

            mockPrismaService.disponibilidade.create.mockResolvedValue(
                mockDisponibilidadeCriada,
            );

            // Act
            const result = await disponibilidadeService.criarDisponibilidade(mockBody as any);

            // Assert
            expect(prismaService.disponibilidade.create).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                message: 'Disponibilidade criada com sucesso!',
                disponibilidade: mockDisponibilidadeCriada,
            });
        });

    });

    describe('updateAvailability', () => {

        it('deve retornar erro se a disponibilidade nao existir', async () => {

            // Arrange
            const idDisponibilidade = 999;
            const mockBody = {
                Duracao: 90,
                Modalidade: 'Ballet',
                MaxAlunos: 8,
            };

            mockPrismaService.disponibilidade.count.mockResolvedValue(0);

            // Act
            const action = disponibilidadeService.updateAvailability(idDisponibilidade, mockBody as any);

            // Assert
            await expect(action).rejects.toThrow(`A disponibilidade com ID ${idDisponibilidade} não existe.`);

            expect(prismaService.disponibilidade.count).toHaveBeenCalledTimes(1);
            expect(prismaService.disponibilidade.count).toHaveBeenCalledWith({
                where: { ID_Disponibilidade: idDisponibilidade },
            });
            expect(prismaService.disponibilidade.update).not.toHaveBeenCalled();
        });

        it('deve atualizar disponibilidade quando ela existir', async () => {

            // Arrange
            const idDisponibilidade = 1;
            const mockBody = {
                Duracao: 90,
                Modalidade: 'Ballet',
                MaxAlunos: 8,
                ValorPorAluno: 50,
            };

            const mockDisponibilidadeAtualizada = {
                ID_Disponibilidade: idDisponibilidade,
                ID_Professor: 1,
                Hora_Inicio: new Date('2099-05-09T09:00:00Z'),
                EstadoDisponibilidadeID: 2,
                AlteradoPorUtilizadorID: 3,
                Duracao: 90,
                Modalidade: 'Ballet',
                IdEstudio: null,
                MaxAlunos: 8,
                ValorPorAluno: null,
                DataAtualizacao: new Date(),
            };

            mockPrismaService.disponibilidade.count.mockResolvedValue(1);
            mockPrismaService.disponibilidade.update.mockResolvedValue(mockDisponibilidadeAtualizada);

            // Act
            const result = await disponibilidadeService.updateAvailability(idDisponibilidade, mockBody as any);

            // Assert
            expect(prismaService.disponibilidade.count).toHaveBeenCalledTimes(1);
            expect(prismaService.disponibilidade.count).toHaveBeenCalledWith({
                where: { ID_Disponibilidade: idDisponibilidade },
            });
            expect(prismaService.disponibilidade.update).toHaveBeenCalledTimes(1);
            expect(prismaService.disponibilidade.update).toHaveBeenCalledWith({
                where: {
                    ID_Disponibilidade: idDisponibilidade,
                },
                data: {
                    ...mockBody,
                    DataAtualizacao: expect.any(Date),
                },
            });
            expect(result).toEqual({
                message: 'Disponibiliade atualizada com sucesso.',
                disponibilidade: mockDisponibilidadeAtualizada,
            });
        });

        it('deve retornar erro se o ValorPorAluno for negativo', async () => {

            // Arrange
            const idDisponibilidade = 1;
            const mockBody = {
                ValorPorAluno: -10,
            };

            mockPrismaService.disponibilidade.count.mockResolvedValue(1);

            // Act
            const action = disponibilidadeService.updateAvailability(idDisponibilidade, mockBody as any);

            // Assert
            await expect(action).rejects.toThrow('O valor por aluno não pode ser negativo.');

            expect(prismaService.disponibilidade.count).toHaveBeenCalledTimes(1);
            expect(prismaService.disponibilidade.count).toHaveBeenCalledWith({
                where: { ID_Disponibilidade: idDisponibilidade },
            });
            expect(prismaService.disponibilidade.update).not.toHaveBeenCalled();
        });

    });

});
