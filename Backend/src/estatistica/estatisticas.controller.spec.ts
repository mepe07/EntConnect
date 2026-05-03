import { Test, TestingModule } from '@nestjs/testing';

import { EstatisticasController } from './estatisticas.controller';
import { EstatisticasService } from './estatisticas.service';

describe('EstatisticasController', () => {
  let controller: EstatisticasController;

  const estatisticasServiceMock = {
    getAlunos: jest.fn(),
    getAulasHoje: jest.fn(),
    getDashboardEncarregado: jest.fn(),
    getDashboardProfessor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstatisticasController],
      providers: [{ provide: EstatisticasService, useValue: estatisticasServiceMock }],
    }).compile();

    controller = module.get<EstatisticasController>(EstatisticasController);
    jest.resetAllMocks();
  });

  it('deve delegar métricas de alunos', async () => {
    const resposta = { total: 1, tendencia: 0 };
    estatisticasServiceMock.getAlunos.mockResolvedValue(resposta);

    await expect(controller.getAlunos()).resolves.toBe(resposta);
  });

  it('deve delegar aulas de hoje', async () => {
    const resposta = { total: 2, tendencia: 100 };
    estatisticasServiceMock.getAulasHoje.mockResolvedValue(resposta);

    await expect(controller.getAulasHoje()).resolves.toBe(resposta);
  });

  it('deve converter id e delegar dashboard do encarregado', async () => {
    const resposta = { totalEducandos: 2 };
    estatisticasServiceMock.getDashboardEncarregado.mockResolvedValue(resposta);

    await expect(controller.getDashboardEncarregado('7')).resolves.toBe(resposta);
    expect(estatisticasServiceMock.getDashboardEncarregado).toHaveBeenCalledWith(7);
  });

  it('deve converter id e delegar dashboard do professor com datas', async () => {
    const resposta = { sessoesConcluidas: 1 };
    estatisticasServiceMock.getDashboardProfessor.mockResolvedValue(resposta);

    await expect(controller.getDashboardProfessor('9', '2026-05-01', '2026-05-31')).resolves.toBe(resposta);
    expect(estatisticasServiceMock.getDashboardProfessor).toHaveBeenCalledWith(9, '2026-05-01', '2026-05-31');
  });
});
