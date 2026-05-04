import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { MarcacoesService } from './marcacoes.service';

describe('MarcacoesService', () => {
  let service: MarcacoesService;

  const prismaMock = {
    coaching_Aluno: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    coaching: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcacoesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MarcacoesService>(MarcacoesService);
    jest.resetAllMocks();
  });

  it('deve listar marcações do encarregado', async () => {
    const marcacoes = [{ ID_Coaching: 1 }];
    prismaMock.coaching_Aluno.findMany.mockResolvedValue(marcacoes);

    await expect(service.getMarcacoesbyEE(10)).resolves.toBe(marcacoes);
    expect(prismaMock.coaching_Aluno.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ID_Enc_Educacao: 10 } }),
    );
  });

  it('deve agrupar confirmações por sessão de coaching', async () => {
    const inicio = new Date('2026-05-01T10:00:00.000Z');
    prismaMock.coaching_Aluno.findMany.mockResolvedValue([
      {
        ID_Aluno: 1,
        Aluno: { Nome: 'Aluno Um' },
        Coaching: {
          ID_Coaching: 5,
          Inicio_Coaching: inicio,
          Duracao: 60,
          Disponibilidade: { Modalidade: 'Salsa' },
          Estado_Coaching: { Tipo: 'Pendente' },
          Professor: { Pessoa: { Nome: 'Professora Ana' } },
        },
      },
      {
        ID_Aluno: 2,
        Aluno: { Nome: 'Aluno Dois' },
        Coaching: {
          ID_Coaching: 5,
          Inicio_Coaching: inicio,
          Duracao: 60,
          Disponibilidade: { Modalidade: 'Salsa' },
          Estado_Coaching: { Tipo: 'Pendente' },
          Professor: { Pessoa: { Nome: 'Professora Ana' } },
        },
      },
    ]);

    const resultado = await service.getConfirmacoesByEE(10);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(
      expect.objectContaining({
        idCoaching: 5,
        modalidade: 'Salsa',
        alunos: [
          { idAluno: 1, nome: 'Aluno Um' },
          { idAluno: 2, nome: 'Aluno Dois' },
        ],
      }),
    );
  });

  it('deve confirmar o EE quando não há pendentes sem concluir se o professor ainda não confirmou', async () => {
    prismaMock.coaching_Aluno.count.mockResolvedValue(0);
    prismaMock.coaching.findUnique.mockResolvedValue({
      ID_Estado_Coaching: 7,
      confirmacao_prof: false,
    });

    await expect(service.confirmarSessaoByEE(10, 5, 13)).resolves.toEqual({
      message:
        'Confirmação do encarregado registada. A aguardar confirmação do professor.',
    });
    expect(prismaMock.coaching_Aluno.updateMany).toHaveBeenCalledWith({
      where: { ID_Enc_Educacao: 10, ID_Coaching: 5 },
      data: { confirmado: true },
    });
    expect(prismaMock.coaching.findUnique).toHaveBeenCalledWith({
      where: { ID_Coaching: 5 },
      select: {
        ID_Estado_Coaching: true,
        confirmacao_prof: true,
      },
    });
    expect(prismaMock.coaching.update).toHaveBeenCalledWith({
      where: { ID_Coaching: 5 },
      data: { ID_Estado_Coaching: 7, confirmacao_EE: true },
    });
  });

  it('deve concluir a sessão quando todos os alunos e o professor já confirmaram', async () => {
    prismaMock.coaching_Aluno.count.mockResolvedValue(0);
    prismaMock.coaching.findUnique.mockResolvedValue({
      ID_Estado_Coaching: 7,
      confirmacao_prof: true,
    });

    await expect(service.confirmarSessaoByEE(10, 5, 13)).resolves.toEqual({
      message:
        'Sessão finalizada com sucesso (professor e encarregado confirmaram).',
    });

    expect(prismaMock.coaching.update).toHaveBeenCalledWith({
      where: { ID_Coaching: 5 },
      data: { ID_Estado_Coaching: 13, confirmacao_EE: true },
    });
  });

  it('deve manter a sessão sem confirmacao_EE global enquanto houver alunos pendentes', async () => {
    prismaMock.coaching_Aluno.count.mockResolvedValue(1);

    await expect(service.confirmarSessaoByEE(10, 5, 13)).resolves.toEqual({
      message:
        'Confirmação registada. A aguardar confirmação dos restantes alunos.',
    });

    expect(prismaMock.coaching.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.coaching.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar estado inválido e não atualizar', async () => {
    await expect(service.confirmarSessaoByEE(10, 5, 99)).rejects.toThrow(
      'ID de estado de coaching inválido.',
    );
    expect(prismaMock.coaching_Aluno.updateMany).not.toHaveBeenCalled();
  });
});
