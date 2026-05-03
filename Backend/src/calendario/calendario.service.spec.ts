import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CalendarioService } from './calendario.service';

describe('CalendarioService', () => {
  let service: CalendarioService;

  const prismaMock = {
    evento: { findMany: jest.fn() },
    coaching: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarioService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CalendarioService>(CalendarioService);
    jest.resetAllMocks();
  });

  it('deve consultar eventos e coachings no intervalo pedido e mapear o resultado', async () => {
    const inicioEvento = new Date('2026-05-10T10:00:00.000Z');
    const inicioCoaching = new Date('2026-05-11T11:00:00.000Z');

    prismaMock.evento.findMany.mockResolvedValue([
      {
        ID_Evento: 1,
        Titulo: 'Workshop',
        Resumo: 'Resumo',
        Descricao: 'Descrição',
        Local: 'Sala A',
        Data_Inicio: inicioEvento,
        Data_Fim: null,
        Tipo: 'Evento',
      },
    ]);
    prismaMock.coaching.findMany.mockResolvedValue([
      {
        ID_Coaching: 2,
        Inicio_Coaching: inicioCoaching,
        Duracao: 60,
        Disponibilidade: { Modalidade: 'Salsa' },
        Professor: { Pessoa: { Nome: 'Professora Ana' } },
        Sala: { Nome: 'Estúdio A' },
        Estado_Coaching: { Tipo: 'Agendada' },
        _count: { Coaching_Aluno: 3 },
      },
    ]);

    const resultado = await service.getCalendarItems('2026-05-01', '2026-05-31');

    expect(prismaMock.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          Publico: true,
          Publicado: true,
          Ativo: true,
        }),
        orderBy: { Data_Inicio: 'asc' },
      }),
    );
    expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { Inicio_Coaching: { gte: expect.any(Date), lte: expect.any(Date) } },
        include: expect.objectContaining({ Sala: true }),
      }),
    );
    expect(resultado).toEqual({
      eventos: [
        {
          id: 1,
          titulo: 'Workshop',
          resumo: 'Resumo',
          descricao: 'Descrição',
          local: 'Sala A',
          dataInicio: inicioEvento,
          dataFim: null,
          tipo: 'Evento',
        },
      ],
      coachings: [
        {
          idCoaching: 2,
          inicioCoaching,
          duracao: 60,
          modalidade: 'Salsa',
          professor: 'Professora Ana',
          sala: 'Estúdio A',
          estado: 'Agendada',
          inscritos: 3,
        },
      ],
    });
  });
});
