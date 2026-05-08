import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CoachingService } from './coaching.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { mock } from 'node:test';

describe('CoachingService - inscreverAluno', () => {
  let coachingService: CoachingService;
  let prismaService: PrismaService;

  // Mock Prisma
  const mockPrismaService = {
    disponibilidade: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    coaching: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    coaching_Aluno: {
      create: jest.fn(),
    },
  };

  // Configuração do módulo de teste
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    coachingService = module.get<CoachingService>(CoachingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Limpar os mocks depois de cada testes
  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('inscreverAluno', () => {

    it.only('deve retornar erro se não existirem vagas (MaxAlunos = 0)', async () => {

      // Arrange
      const idDisponibilidade = 1;
      const mockBody = { idAluno: 10 };

      // O que o mock Prisma deve responder
      jest.spyOn(prismaService.disponibilidade, 'findUnique').mockResolvedValue({
        MaxAlunos: 0,
      } as any);

      // Act
      const action = coachingService.inscreverAluno(idDisponibilidade, mockBody);

      // Assert
      await expect(action).rejects.toThrow('Não existem vagas disponíveis para esta sessão.');

      expect(prismaService.disponibilidade.findUnique).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: idDisponibilidade },
        select: { MaxAlunos: true },
      });

      // Garantir que a execução parou ali
      expect(prismaService.coaching.findFirst).not.toHaveBeenCalled();
      expect(prismaService.coaching_Aluno.create).not.toHaveBeenCalled();
    });



    it('lança erro quando a disponibilidade não existe', async () => {
      
      // Arrange
      const idDisponibilidade = 999;
      const mockBody = {
        idAluno: 10,
        obs: 'Aluno dedicado',
        valorEmFalta: 45,
        idEncEducacao: 4,
      };

      // Não encontrou disponibilidade
      jest.spyOn(prismaService.disponibilidade, 'findUnique').mockResolvedValue(null as any);

      // Act
      await expect(coachingService.inscreverAluno(idDisponibilidade, mockBody)).rejects.toThrow(
        'Não existem vagas disponíveis para esta sessão.',
      );

      // Assert
      expect(prismaService.disponibilidade.findUnique).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: idDisponibilidade },
        select: { MaxAlunos: true },
      });

      // Garantir que a execução parou imediatamente e não tentou criar nada
      expect(prismaService.coaching.findFirst).not.toHaveBeenCalled();
      expect(prismaService.coaching.create).not.toHaveBeenCalled();
      expect(prismaService.coaching_Aluno.create).not.toHaveBeenCalled();
    });

    it('deve inscrever aluno com sucesso quando a sessão de coaching já existe', async () => {

      // Arrange
      const idDisponibilidade = 1;
      const mockBody = {
        idAluno: 10,
        obs: 'Aluno dedicado',
        valorEmFalta: 45,
        idEncEducacao: 4,
      };

      // Assumir que há vagas
      jest.spyOn(prismaService.disponibilidade, 'findUnique').mockResolvedValue({
        MaxAlunos: 5,
      } as any);

      // Assumir que a sessão já está criada
      jest.spyOn(prismaService.coaching, 'findFirst').mockResolvedValue({
        ID_Coaching: 100,
      } as any);

      // Mock do retorno da inscrição
      const mockInscricao = { ID_Coaching: 100, ID_Aluno: 10, Observacoes: 'Aluno regular'};
      jest.spyOn(prismaService.coaching_Aluno, 'create').mockResolvedValue(mockInscricao as any);

      // Act
      const resultado = await coachingService.inscreverAluno(idDisponibilidade, mockBody);

      // Assert
      expect(resultado).toEqual({
        message: 'Aluno inscrito com sucesso!',
        inscricao: mockInscricao,
      });

      // Garantir que o create do coaching nao foi chamado porque a sessão já existe
      expect(prismaService.coaching.create).not.toHaveBeenCalled();

      // Verificar se o aluno foi efetivamente "inscrito"
      expect(prismaService.coaching_Aluno.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Coaching: 100,
          ID_Aluno: mockBody.idAluno,
          Observacoes: mockBody.obs,
          ValorEmFalta: mockBody.valorEmFalta,
          ID_Enc_Educacao: mockBody.idEncEducacao,
        }),
      });

      expect(prismaService.disponibilidade.update).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: idDisponibilidade },
        data: { MaxAlunos: { decrement: 1}},
      });
    });

    it('cria uma sessão de coaching, inscreve o aluno e decrementa uma vaga quando ainda não existe sessão', async () => {
      
      // Arrange
      const idDisponibilidade = 1;
      const mockBody = {
        idAluno: 10,
        obs: 'Aluno dedicado',
        valorEmFalta: 45,
        idEncEducacao: 4,
      };

      // Assumir que há vagas
      jest.spyOn(prismaService.disponibilidade, 'findUnique').mockResolvedValue({
        MaxAlunos: 5,
      } as any);

      // Assumir que a sessão não está criada
      jest.spyOn(prismaService.coaching, 'findFirst').mockResolvedValue(null);

      // Mock da criação do coaching
      jest.spyOn(prismaService.coaching, 'create').mockResolvedValue({
        ID_Coaching: 200,
        ID_Aluno: mockBody.idAluno,
      } as any);      

      // Mock do retorno da inscrição
      const mockInscricao = { ID_Coaching: 100, ID_Aluno: 10, Observacoes: 'Aluno regular'};
      jest.spyOn(prismaService.coaching_Aluno, 'create').mockResolvedValue(mockInscricao as any);

      // Act
      const resultado = await coachingService.inscreverAluno(idDisponibilidade, mockBody);

      // Assert
      expect(resultado).toEqual({
        message: 'Aluno inscrito com sucesso!',
        inscricao: mockInscricao,
      });

      // Garantir que o create do coaching foi chamado
      expect(prismaService.coaching.create).toHaveBeenCalled();

      // Verificar se o aluno foi efetivamente "inscrito"
      expect(prismaService.coaching_Aluno.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Coaching: 200,
          ID_Aluno: mockBody.idAluno,
          Observacoes: mockBody.obs,
          ValorEmFalta: mockBody.valorEmFalta,
          ID_Enc_Educacao: mockBody.idEncEducacao,
        }),
      });

      expect(prismaService.disponibilidade.update).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: idDisponibilidade },
        data: { MaxAlunos: { decrement: 1}},
      });
    });


    
  }); // Fim describe 'inscreverAluno'

}); // Fim describe CoachingService


// // it('cria uma sessão de coaching, inscreve o aluno e decrementa uma vaga quando ainda não existe sessão', ...)

// // it('usa a sessão de coaching existente, inscreve o aluno e decrementa uma vaga quando a sessão já existe', ...)

