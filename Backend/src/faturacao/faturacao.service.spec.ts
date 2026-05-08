import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FaturacaoService', () => {
  let faturacaoService: FaturacaoService;
  let prismaService: PrismaService;

  // Mock Prisma
  const mockPrismaService = {
    coaching_Aluno: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const criarFatura = (override: Record<string, unknown> = {}) =>
    ({
      ID_Coaching: 1,
      ID_Aluno: 2,
      ValorEmFalta: 10,
      Aluno: {
        Nome: 'Aluno',
        Enc_Educacao: {
          Pessoa: { Nome: 'EE', Email: 'ee@test', Contacto: '910' },
        },
      },
      Enc_Educacao: null,
      Coaching: {
        Inicio_Coaching: new Date('2026-05-01T10:00:00.000Z'),
        Duracao: 60,
        ValorPorAluno: 25,
        Professor: {
          Pessoa: { Nome: 'Prof', Email: 'prof@test', Foto: 'foto' },
        },
        Sala: { Nome: 'Estúdio A' },
        Estado_Coaching: { Tipo: 'Agendada' },
      },
      ...override,
    }) as any;

  // Configuração do módulo de teste
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaturacaoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    faturacaoService = module.get<FaturacaoService>(FaturacaoService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Limpar os mocks depois de cada teste
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('obterFaturacaoGeral', () => {
    it('deve obter faturação geral mapeada com sucesso', async () => {
      // Arrange
      const mockFaturas = [criarFatura()];
      jest.spyOn(prismaService.coaching_Aluno, 'findMany').mockResolvedValue(mockFaturas as any);

      // Act
      const resultado = await faturacaoService.obterFaturacaoGeral();

      // Assert
      expect(prismaService.coaching_Aluno.findMany).toHaveBeenCalled();
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          idCoaching: 1,
          idAluno: 2,
          nomeProfessor: 'Prof',
          valorTotal: 25,
          valorEmFalta: 10,
          estaPago: false,
          salaNome: 'Estúdio A',
        }),
      );
    });
  });

  describe('obterPagamentosCoachingAdmin', () => {
    it('deve obter pagamentos admin e filtrar corretamente por estado', async () => {
      // Arrange
      const mockFaturas = [
        criarFatura({ ValorEmFalta: 0 }), // Estado "pago"
        criarFatura({
          ValorEmFalta: 10, // Estado não pago
          Coaching: {
            ...criarFatura().Coaching,
            Inicio_Coaching: new Date('2020-01-01'),
          },
        }),
      ];
      jest.spyOn(prismaService.coaching_Aluno, 'findMany').mockResolvedValue(mockFaturas as any);

      const filtros = { estado: 'pago' };

      // Act
      const resultado = await faturacaoService.obterPagamentosCoachingAdmin(filtros);

      // Assert
      expect(prismaService.coaching_Aluno.findMany).toHaveBeenCalled();
      expect(resultado).toHaveLength(1); // Espera-se que só retorne o pago
      expect(resultado[0]).toEqual(
        expect.objectContaining({ estadoPagamento: 'pago', valorPago: 25 }),
      );
    });
  });

  describe('getDashboardFinanceiro', () => {
    it('deve gerar dashboard financeiro com resumo e top professores', async () => {
      // Arrange
      const dataInicio = new Date('2026-05-01');
      const dataFim = new Date('2026-05-01');
      const mockFaturas = [criarFatura()];
      
      jest.spyOn(prismaService.coaching_Aluno, 'findMany').mockResolvedValue(mockFaturas as any);

      // Act
      const resultado = await faturacaoService.getDashboardFinanceiro(dataInicio, dataFim);

      // Assert
      expect(prismaService.coaching_Aluno.findMany).toHaveBeenCalled();
      expect(resultado.resumoGeral).toEqual({ totalPago: 15, totalEmDivida: 10 });
      expect(resultado.topProfessores).toEqual([{ nome: 'Prof', total: 15 }]);
    });
  });

  describe('registarPagamento', () => {
    it('lança NotFoundException quando a inscrição/fatura não existe', async () => {
      // Arrange
      const idCoaching = 1;
      const idAluno = 2;
      
      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(null);

      // Act
      const action = faturacaoService.registarPagamento(idCoaching, idAluno);

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
      expect(prismaService.coaching_Aluno.findUnique).toHaveBeenCalled();
      
      // Garantir que a execução parou e não tentou atualizar nada
      expect(prismaService.coaching_Aluno.update).not.toHaveBeenCalled();
    });

    it('lança BadRequestException se o valor a pagar for inválido (<= 0)', async () => {
      // Arrange
      const idCoaching = 1;
      const idAluno = 2;
      const valorInvalido = 0;
      const mockFatura = criarFatura();

      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(mockFatura as any);

      // Act
      const action = faturacaoService.registarPagamento(idCoaching, idAluno, valorInvalido);

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
      expect(prismaService.coaching_Aluno.update).not.toHaveBeenCalled();
    });

    it('deve registar o pagamento total com sucesso', async () => {
      // Arrange
      const idCoaching = 1;
      const idAluno = 2;
      const mockFatura = criarFatura({ ValorEmFalta: 10 });
      
      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(mockFatura as any);
      
      jest.spyOn(prismaService.coaching_Aluno, 'update').mockResolvedValue({
        ID_Coaching: idCoaching,
        ID_Aluno: idAluno,
        ValorEmFalta: 0,
      } as any);

      // Act
      // Simulando liquidação total (sem passar o 3º parâmetro de valor parcial)
      const resultado = await faturacaoService.registarPagamento(idCoaching, idAluno);

      // Assert
      expect(prismaService.coaching_Aluno.update).toHaveBeenCalled();
      expect(resultado).toEqual(
        expect.objectContaining({
          valorEmFalta: 0,
          valorPagoRegistado: 10,
        }),
      );
    });

    it('deve registar um pagamento parcial com sucesso', async () => {
      
      // Arrange
      const idCoaching = 1;
      const idAluno = 2;
      const valorPagoParcial = 5;
      const mockFatura = criarFatura({ ValorEmFalta: 10 });
      
      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(mockFatura as any);
      
      jest.spyOn(prismaService.coaching_Aluno, 'update').mockResolvedValue({
        ID_Coaching: idCoaching,
        ID_Aluno: idAluno,
        ValorEmFalta: 5, // Ficam 5 em falta
      } as any);

      // Act
      const resultado = await faturacaoService.registarPagamento(idCoaching, idAluno, valorPagoParcial);

      // Assert
      expect(prismaService.coaching_Aluno.update).toHaveBeenCalled();
      expect(resultado).toEqual(
        expect.objectContaining({
          valorEmFalta: 5,
          valorPagoRegistado: 5,
        }),
      );
    });

  }); // Fim describe 'registarPagamento'

}); // Fim describe FaturacaoService