import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FaturacaoController } from './faturacao.controller';
import { FaturacaoService } from './faturacao.service';

describe('FaturacaoController', () => {
  let controller: FaturacaoController;
  let consoleLogSpy: jest.SpyInstance;

  const faturacaoServiceMock = {
    obterFaturacaoGeral: jest.fn(),
    obterRelatorioFaturacaoGeral: jest.fn(),
    obterFaturacaoPorEncarregado: jest.fn(),
    obterPagamentosCoachingAdmin: jest.fn(),
    registarPagamento: jest.fn(),
    getHistoricoCoaching: jest.fn(),
    getDashboardFinanceiro: jest.fn(),
    getPrevisaoFinanceira: jest.fn(),
  };

  const criarBearerTokenFake = (payload: Record<string, unknown>) => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
      'base64url',
    );
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `Bearer ${header}.${body}.sig`;
  };

  beforeEach(async () => {
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaturacaoController],
      providers: [
        { provide: FaturacaoService, useValue: faturacaoServiceMock },
      ],
    }).compile();

    controller = module.get<FaturacaoController>(FaturacaoController);
    jest.clearAllMocks();
    Object.values(faturacaoServiceMock).forEach((mock) =>
      mock.mockResolvedValue({ ok: true }),
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('deve delegar faturação geral, encarregado, pagamentos e previsão', async () => {
    await controller.obterFaturacaoGeral();
    await controller.obterFaturacaoPorEncarregado('7');
    await controller.obterPagamentosCoachingAdmin(
      '2026-05-01',
      '2026-05-31',
      'prof',
      'ee',
      'pago',
    );
    await controller.getPrevisao();

    expect(
      faturacaoServiceMock.obterFaturacaoPorEncarregado,
    ).toHaveBeenCalledWith(7);
    expect(
      faturacaoServiceMock.obterPagamentosCoachingAdmin,
    ).toHaveBeenCalledWith({
      inicio: expect.any(Date),
      fim: expect.any(Date),
      professor: 'prof',
      encarregado: 'ee',
      estado: 'pago',
    });
  });

  it('deve descodificar token no relatório e histórico', async () => {
    const token = criarBearerTokenFake({ role: 'Professor', sub: 99 });

    await controller.getRelatorio('2026-05-01', '2026-05-31', token);
    await controller.getHistorico('2026-05-01', '2026-05-31', token);

    expect(
      faturacaoServiceMock.obterRelatorioFaturacaoGeral,
    ).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 'Professor', 99);
    expect(faturacaoServiceMock.getHistoricoCoaching).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      'Professor',
      99,
    );
  });

  it('deve validar token e datas obrigatórias', async () => {
    await expect(
      controller.getRelatorio('2026-05-01', '2026-05-31', ''),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      controller.getRelatorio('', '2026-05-31', criarBearerTokenFake({})),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.getHistorico('data', '2026-05-31', criarBearerTokenFake({})),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve registar pagamento e gerar dashboard', async () => {
    await controller.registarPagamento('1', '2', 5);
    await controller.getDashboard('2026-05-01', '2026-05-31');

    expect(faturacaoServiceMock.registarPagamento).toHaveBeenCalledWith(
      1,
      2,
      5,
    );
    expect(faturacaoServiceMock.getDashboardFinanceiro).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
    );
  });
});
