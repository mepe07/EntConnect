import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { FaturacaoService } from './faturacao.service';

describe('FaturacaoService', () => {
  let service: FaturacaoService;

  const prismaMock = {
    coaching_Aluno: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const criarFatura = (override: Record<string, unknown> = {}) => ({
    ID_Coaching: 1,
    ID_Aluno: 2,
    ValorEmFalta: 10,
    Aluno: { Nome: 'Aluno', Enc_Educacao: { Pessoa: { Nome: 'EE', Email: 'ee@test', Contacto: '910' } } },
    Enc_Educacao: null,
    Coaching: {
      Inicio_Coaching: new Date('2026-05-01T10:00:00.000Z'),
      Duracao: 60,
      ValorPorAluno: 25,
      Professor: { Pessoa: { Nome: 'Prof', Email: 'prof@test', Foto: 'foto' } },
      Sala: { Nome: 'Estúdio A' },
      Estado_Coaching: { Tipo: 'Agendada' },
    },
    ...override,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaturacaoService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FaturacaoService>(FaturacaoService);
    jest.resetAllMocks();
  });

  it('deve obter faturação geral mapeada', async () => {
    prismaMock.coaching_Aluno.findMany.mockResolvedValue([criarFatura()]);

    const resultado = await service.obterFaturacaoGeral();

    expect(resultado[0]).toEqual(expect.objectContaining({
      idCoaching: 1,
      idAluno: 2,
      nomeProfessor: 'Prof',
      valorTotal: 25,
      valorEmFalta: 10,
      estaPago: false,
      salaNome: 'Estúdio A',
    }));
  });

  it('deve obter pagamentos admin e filtrar por estado', async () => {
    prismaMock.coaching_Aluno.findMany.mockResolvedValue([
      criarFatura({ ValorEmFalta: 0 }),
      criarFatura({ ValorEmFalta: 10, Coaching: { ...criarFatura().Coaching, Inicio_Coaching: new Date('2020-01-01') } }),
    ]);

    const resultado = await service.obterPagamentosCoachingAdmin({ estado: 'pago' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(expect.objectContaining({ estadoPagamento: 'pago', valorPago: 25 }));
  });

  it('deve gerar dashboard financeiro', async () => {
    prismaMock.coaching_Aluno.findMany.mockResolvedValue([criarFatura()]);

    const resultado = await service.getDashboardFinanceiro(new Date('2026-05-01'), new Date('2026-05-01'));

    expect(resultado.resumoGeral).toEqual({ totalPago: 15, totalEmDivida: 10 });
    expect(resultado.topProfessores).toEqual([{ nome: 'Prof', total: 15 }]);
  });

  it('deve registar pagamento total, parcial e rejeitar inválidos', async () => {
    prismaMock.coaching_Aluno.findUnique.mockResolvedValue(criarFatura());
    prismaMock.coaching_Aluno.update.mockResolvedValue({ ID_Coaching: 1, ID_Aluno: 2, ValorEmFalta: 0 });

    await expect(service.registarPagamento(1, 2)).resolves.toEqual(expect.objectContaining({
      valorEmFalta: 0,
      valorPagoRegistado: 10,
    }));

    await expect(service.registarPagamento(1, 2, 0)).rejects.toThrow(BadRequestException);

    prismaMock.coaching_Aluno.findUnique.mockResolvedValue(null);
    await expect(service.registarPagamento(1, 2)).rejects.toThrow(NotFoundException);
  });
});
