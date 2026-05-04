import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AgendamentosService } from './Agendamentos.service';

describe('AgendamentosService', () => {
  let service: AgendamentosService;

  const prismaMock = {
    coaching: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const criarSessao = () => ({
    ID_Coaching: 1,
    Inicio_Coaching: new Date('2026-05-01T10:00:00.000Z'),
    Duracao: 60,
    Professor: { Pessoa: { Nome: 'Professora Ana' } },
    Disponibilidade: { Modalidade: 'Salsa' },
    Estado_Coaching: { Tipo: 'Pendente' },
    Coaching_Aluno: [{ ID_Aluno: 7, Aluno: { Nome: 'Aluno Um' } }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentosService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AgendamentosService>(AgendamentosService);
    jest.resetAllMocks();
  });

  it('deve listar agendamentos futuros do professor', async () => {
    prismaMock.coaching.findMany.mockResolvedValue([criarSessao()]);

    const resultado = await service.getAgendamentosProfessor(10);

    expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ID_Professor: 10,
          ID_Estado_Coaching: 7,
        }),
        orderBy: { Inicio_Coaching: 'asc' },
      }),
    );
    expect(resultado[0]).toEqual(
      expect.objectContaining({
        idCoaching: 1,
        nomeProfessor: 'Professora Ana',
        modalidade: 'Salsa',
        alunos: [{ idAluno: 7, nome: 'Aluno Um' }],
      }),
    );
  });

  it('deve listar confirmações passadas do professor', async () => {
    prismaMock.coaching.findMany.mockResolvedValue([criarSessao()]);

    await service.getConfirmacoesProfessor(10);

    expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ID_Professor: 10,
          Inicio_Coaching: { lt: expect.any(Date) },
          ID_Estado_Coaching: 7,
        }),
        orderBy: { Inicio_Coaching: 'desc' },
      }),
    );
  });

  it('deve atualizar confirmação do professor', async () => {
    prismaMock.coaching.findFirst.mockResolvedValue({ ID_Coaching: 1 });

    await expect(
      service.atualizarConfirmacaoProfessor(10, 1, 13),
    ).resolves.toEqual({
      message: 'Estado de coaching atualizado com sucesso.',
    });
    expect(prismaMock.coaching.update).toHaveBeenCalledWith({
      where: { ID_Coaching: 1 },
      data: { ID_Estado_Coaching: 13 },
    });
  });

  it('deve rejeitar estado inválido ou sessão de outro professor', async () => {
    await expect(
      service.atualizarConfirmacaoProfessor(10, 1, 99),
    ).rejects.toThrow('ID de estado de coaching inválido.');

    prismaMock.coaching.findFirst.mockResolvedValue(null);
    await expect(
      service.atualizarConfirmacaoProfessor(10, 1, 13),
    ).rejects.toThrow('Sessão de coaching não encontrada para este professor.');
  });
});
