import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { EstatisticasService } from './estatisticas.service';

describe('EstatisticasService', () => {
  let service: EstatisticasService;

  const prismaMock = {
    aluno: { count: jest.fn() },
    coaching: { count: jest.fn(), findMany: jest.fn() },
    utilizador: { findUnique: jest.fn() },
    coaching_Aluno: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstatisticasService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<EstatisticasService>(EstatisticasService);
    jest.resetAllMocks();
  });

  it('deve devolver total de alunos', async () => {
    prismaMock.aluno.count.mockResolvedValue(42);

    await expect(service.getAlunos()).resolves.toEqual({
      total: 42,
      tendencia: 0,
    });
  });

  it('deve devolver zeros quando a contagem de alunos falha', async () => {
    prismaMock.aluno.count.mockRejectedValue(new Error('db'));

    await expect(service.getAlunos()).resolves.toEqual({
      total: 0,
      tendencia: 0,
    });
  });

  it('deve calcular aulas de hoje e tendência face a ontem', async () => {
    prismaMock.coaching.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);

    await expect(service.getAulasHoje()).resolves.toEqual({
      total: 4,
      tendencia: 100,
    });
  });

  it('deve calcular dashboard do encarregado', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
    prismaMock.coaching_Aluno.findMany
      .mockResolvedValueOnce([{ ValorEmFalta: 15 }, { ValorEmFalta: 10.5 }])
      .mockResolvedValueOnce([
        { Coaching: { ID_Estado_Coaching: 6 } },
        { Coaching: { ID_Estado_Coaching: 7 } },
        { Coaching: { ID_Estado_Coaching: 7 } },
      ]);
    prismaMock.aluno.count.mockResolvedValue(3);

    await expect(service.getDashboardEncarregado(1)).resolves.toEqual({
      pagamentosAtraso: 25.5,
      sessoesConfirmar: 1,
      sessoesMarcadas: 2,
      totalEducandos: 3,
    });
  });

  it('deve devolver zeros no dashboard do encarregado sem pessoa associada', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue(null);

    await expect(service.getDashboardEncarregado(1)).resolves.toEqual({
      pagamentosAtraso: 0,
      sessoesConfirmar: 0,
      sessoesMarcadas: 0,
      totalEducandos: 0,
    });
  });

  it('deve calcular dashboard do professor com duração formatada', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue({ ID_Pessoa: 20 });
    prismaMock.coaching.count.mockResolvedValue(5);
    prismaMock.coaching.findMany.mockResolvedValue([
      { Duracao: 60 },
      { Duracao: 45 },
    ]);

    await expect(
      service.getDashboardProfessor(2, '2026-05-01', '2026-05-31'),
    ).resolves.toEqual({
      sessoesConcluidas: 5,
      aulasHojeTotal: 2,
      aulasHojeDuracao: '1h45min',
    });
  });
});
