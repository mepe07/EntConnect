import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { MarcacoesService } from './marcacoes.service'; 
import { PrismaService } from '../../prisma/prisma.service'; 

describe('MarcacoesService - confirmarSessaoByEE', () => {
    let marcacoesService: MarcacoesService;
    let prismaService: PrismaService;

    // Mock Prisma
    const mockPrismaService = {
        coaching_Aluno: {
            updateMany: jest.fn<() => Promise<any>>(),
            count: jest.fn<() => Promise<any>>(),
        },
        coaching: {
            findUnique: jest.fn<() => Promise<any>>(),
            update: jest.fn<() => Promise<any>>(),
        },
    };

    // Configuração do módulo de teste
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MarcacoesService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        marcacoesService = module.get<MarcacoesService>(MarcacoesService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    // Limpar os mocks depois de cada testes
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('confirmarSessaoByEE', () => {

        it('deve retornar erro se o ID de estado de coaching for inválido', async () => {

            // Arrange
            const idEE = 1;
            const idCoaching = 100;
            const idEstadoCoachingInvalido = 99;

            // Act
            const action = marcacoesService.confirmarSessaoByEE(idEE, idCoaching, idEstadoCoachingInvalido);

            // Assert
            await expect(action).rejects.toThrow('ID de estado de coaching inválido.');

            expect(prismaService.coaching_Aluno.updateMany).not.toHaveBeenCalled();
        });

        it('deve atualizar aluno e aguardar se ainda houver alunos pendentes', async () => {

            // Arrange
            const idEE = 1;
            const idCoaching = 100;
            const idEstadoCoaching = 13;

            mockPrismaService.coaching_Aluno.updateMany.mockResolvedValue({ count: 1 });
            mockPrismaService.coaching_Aluno.count.mockResolvedValue(2); // 2 pendentes

            // Act
            const result = await marcacoesService.confirmarSessaoByEE(idEE, idCoaching, idEstadoCoaching);

            // Assert
            expect(prismaService.coaching_Aluno.updateMany).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching_Aluno.updateMany).toHaveBeenCalledWith({
                where: {
                    ID_Enc_Educacao: idEE,
                    ID_Coaching: idCoaching,
                },
                data: {
                    confirmado: true,
                },
            });
            expect(prismaService.coaching_Aluno.count).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.findUnique).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Confirmação registada. A aguardar confirmação dos restantes alunos.',
            });
        });

        it('deve aguardar confirmação do professor se nao houver pendentes mas professor nao confirmou', async () => {

            // Arrange
            const idEE = 1;
            const idCoaching = 100;
            const idEstadoCoaching = 13;

            const mockCoachingInfo = {
                ID_Estado_Coaching: 10,
                confirmacao_prof: false, // Professor ainda não confirmou
            };

            mockPrismaService.coaching_Aluno.updateMany.mockResolvedValue({ count: 1 });
            mockPrismaService.coaching_Aluno.count.mockResolvedValue(0); // 0 pendentes
            mockPrismaService.coaching.findUnique.mockResolvedValue(mockCoachingInfo);
            mockPrismaService.coaching.update.mockResolvedValue({});

            // Act
            const result = await marcacoesService.confirmarSessaoByEE(idEE, idCoaching, idEstadoCoaching);

            // Assert
            expect(prismaService.coaching_Aluno.count).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.findUnique).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.update).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.update).toHaveBeenCalledWith({
                where: { ID_Coaching: idCoaching },
                data: {
                    ID_Estado_Coaching: mockCoachingInfo.ID_Estado_Coaching, // Mantém o estado atual
                    confirmacao_EE: true,
                },
            });
            expect(result).toEqual({
                message: 'Confirmação do encarregado registada. A aguardar confirmação do professor.',
            });
        });

        it('deve finalizar a sessao alterando o estado para 13 se professor e encarregado confirmaram', async () => {

            // Arrange
            const idEE = 1;
            const idCoaching = 100;
            const idEstadoCoaching = 13;

            const mockCoachingInfo = {
                ID_Estado_Coaching: 10,
                confirmacao_prof: true, // Professor já confirmou
            };

            mockPrismaService.coaching_Aluno.updateMany.mockResolvedValue({ count: 1 });
            mockPrismaService.coaching_Aluno.count.mockResolvedValue(0); // 0 pendentes
            mockPrismaService.coaching.findUnique.mockResolvedValue(mockCoachingInfo);
            mockPrismaService.coaching.update.mockResolvedValue({});

            // Act
            const result = await marcacoesService.confirmarSessaoByEE(idEE, idCoaching, idEstadoCoaching);

            // Assert
            expect(prismaService.coaching.findUnique).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.update).toHaveBeenCalledTimes(1);
            expect(prismaService.coaching.update).toHaveBeenCalledWith({
                where: { ID_Coaching: idCoaching },
                data: {
                    ID_Estado_Coaching: 13, // Atualiza para estado 13
                    confirmacao_EE: true,
                },
            });
            expect(result).toEqual({
                message: 'Sessão finalizada com sucesso (professor e encarregado confirmaram).',
            });
        });

    });

});