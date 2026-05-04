import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CoachingService } from './coaching.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CoachingService', () => {
  let service: CoachingService;

  const prismaMock = {
    coaching: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    disponibilidade: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    coaching_Aluno: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    aluno: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CoachingService>(CoachingService);
    jest.resetAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar um registo de coaching com os dados recebidos', async () => {
      const dto = {
        ID_Professor: 1,
        ID_Estado_Coaching: 2,
        ID_Sala: 3,
      } as any;
      const coachingCriado = { ID_Coaching: 10, ...dto };

      prismaMock.coaching.create.mockResolvedValue(coachingCriado);

      await expect(service.create(dto)).resolves.toBe(coachingCriado);
      expect(prismaMock.coaching.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('inscreverAluno', () => {
    const payloadInscricao = {
      idProfessor: 11,
      idEstadoCoaching: 1,
      idSala: 5,
      idCoordenador: 21,
      valorPorAluno: 30,
      inicio_Coaching: '2026-05-05T10:00:00.000Z',
      duracao: 60,
      idAluno: 77,
      obs: 'Primeira aula',
      valorEmFalta: 30,
      idEncEducacao: 88,
    };

    it('deve criar a sessão se ainda não existir, inscrever o aluno e decrementar vagas', async () => {
      const coachingCriado = { ID_Coaching: 100 };
      const inscricaoCriada = { ID_Coaching: 100, ID_Aluno: 77 };

      prismaMock.disponibilidade.findUnique.mockResolvedValue({ MaxAlunos: 2 });
      prismaMock.coaching.findFirst.mockResolvedValue(null);
      prismaMock.coaching.create.mockResolvedValue(coachingCriado);
      prismaMock.coaching_Aluno.create.mockResolvedValue(inscricaoCriada);
      prismaMock.disponibilidade.update.mockResolvedValue({ MaxAlunos: 1 });

      const resultado = await service.inscreverAluno(50, payloadInscricao);

      expect(prismaMock.coaching.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Professor: payloadInscricao.idProfessor,
          ID_Estado_Coaching: payloadInscricao.idEstadoCoaching,
          ID_Sala: payloadInscricao.idSala,
          ID_Coordenador: payloadInscricao.idCoordenador,
          ValorPorAluno: payloadInscricao.valorPorAluno,
          Duracao: payloadInscricao.duracao,
          ID_Disponibilidade: 50,
        }),
      });
      expect(prismaMock.coaching_Aluno.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Coaching: 100,
          ID_Aluno: payloadInscricao.idAluno,
          Observacoes: payloadInscricao.obs,
          ValorEmFalta: payloadInscricao.valorEmFalta,
          ID_Enc_Educacao: payloadInscricao.idEncEducacao,
        }),
      });
      expect(prismaMock.disponibilidade.update).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: 50 },
        data: { MaxAlunos: { decrement: 1 } },
      });
      expect(resultado).toEqual({
        message: 'Aluno inscrito com sucesso!',
        inscricao: inscricaoCriada,
      });
    });

    it('deve usar a sessão existente quando a disponibilidade já tem coaching', async () => {
      prismaMock.disponibilidade.findUnique.mockResolvedValue({ MaxAlunos: 1 });
      prismaMock.coaching.findFirst.mockResolvedValue({ ID_Coaching: 200 });
      prismaMock.coaching_Aluno.create.mockResolvedValue({
        ID_Coaching: 200,
        ID_Aluno: 77,
      });

      await service.inscreverAluno(50, payloadInscricao);

      expect(prismaMock.coaching.create).not.toHaveBeenCalled();
      expect(prismaMock.coaching_Aluno.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Coaching: 200,
          ID_Aluno: 77,
        }),
      });
    });

    it('deve rejeitar inscrição quando não existem vagas', async () => {
      prismaMock.disponibilidade.findUnique.mockResolvedValue({ MaxAlunos: 0 });

      await expect(
        service.inscreverAluno(50, payloadInscricao),
      ).rejects.toThrow('Não existem vagas disponíveis para esta sessão.');
      expect(prismaMock.coaching.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.coaching_Aluno.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar inscrição quando a disponibilidade não existe', async () => {
      prismaMock.disponibilidade.findUnique.mockResolvedValue(null);

      await expect(
        service.inscreverAluno(50, payloadInscricao),
      ).rejects.toThrow('Não existem vagas disponíveis para esta sessão.');
    });
  });

  describe('removerAluno', () => {
    it('deve remover o aluno, devolver uma vaga e apagar a sessão quando era o último inscrito', async () => {
      prismaMock.coaching_Aluno.findFirst.mockResolvedValue({
        ID_Coaching: 10,
        ID_Aluno: 5,
      });
      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Disponibilidade: 40,
      });
      prismaMock.coaching_Aluno.count.mockResolvedValue(1);
      prismaMock.coaching_Aluno.delete.mockResolvedValue({
        ID_Coaching: 10,
        ID_Aluno: 5,
      });
      prismaMock.disponibilidade.update.mockResolvedValue({ MaxAlunos: 1 });
      prismaMock.coaching.delete.mockResolvedValue({ ID_Coaching: 10 });

      await expect(service.removerAluno(5, 10)).resolves.toEqual({
        message: 'Aluno removido com sucesso!',
      });

      expect(prismaMock.coaching_Aluno.delete).toHaveBeenCalledWith({
        where: {
          ID_Coaching_ID_Aluno: {
            ID_Aluno: 5,
            ID_Coaching: 10,
          },
        },
      });
      expect(prismaMock.disponibilidade.update).toHaveBeenCalledWith({
        where: { ID_Disponibilidade: 40 },
        data: { MaxAlunos: { increment: 1 } },
      });
      expect(prismaMock.coaching.delete).toHaveBeenCalledWith({
        where: { ID_Coaching: 10 },
      });
    });

    it('deve manter a sessão quando existem outros alunos inscritos', async () => {
      prismaMock.coaching_Aluno.findFirst.mockResolvedValue({
        ID_Coaching: 10,
        ID_Aluno: 5,
      });
      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Disponibilidade: 40,
      });
      prismaMock.coaching_Aluno.count.mockResolvedValue(2);

      await service.removerAluno(5, 10);

      expect(prismaMock.coaching.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando a inscrição não existe', async () => {
      prismaMock.coaching_Aluno.findFirst.mockResolvedValue(null);

      await expect(service.removerAluno(5, 10)).rejects.toThrow(
        'Inscrição não encontrada!',
      );
      expect(prismaMock.coaching_Aluno.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSessoesFuturasAdmin', () => {
    it('deve devolver sessões futuras formatadas para administração', async () => {
      const inicio = new Date('2026-05-05T10:00:00.000Z');
      prismaMock.coaching.findMany.mockResolvedValue([
        {
          ID_Coaching: 1,
          Inicio_Coaching: inicio,
          Duracao: 60,
          Professor: { Pessoa: { Nome: 'Professora Ana' } },
          Disponibilidade: { Modalidade: 'Salsa' },
          Estado_Coaching: { Tipo: 'Pendente' },
          Coaching_Aluno: [
            { ID_Aluno: 10, Aluno: { Nome: 'Aluno Um' } },
            { ID_Aluno: 11, Aluno: { Nome: 'Aluno Dois' } },
          ],
        },
      ]);

      const resultado = await service.getSessoesFuturasAdmin();

      expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { Inicio_Coaching: { gte: expect.any(Date) } },
          orderBy: { Inicio_Coaching: 'asc' },
        }),
      );
      expect(resultado).toEqual([
        expect.objectContaining({
          idCoaching: 1,
          nomeProfessor: 'Professora Ana',
          modalidade: 'Salsa',
          estado: 'Pendente',
          alunos: [
            { idAluno: 10, nome: 'Aluno Um' },
            { idAluno: 11, nome: 'Aluno Dois' },
          ],
        }),
      ]);
    });
  });

  describe('getKpisAdmin', () => {
    it('deve calcular os KPIs administrativos com quatro contagens', async () => {
      prismaMock.coaching.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(5);

      await expect(service.getKpisAdmin()).resolves.toEqual({
        proximas24h: 2,
        marcadas: 8,
        porValidar: 1,
        realizadasMes: 5,
      });

      expect(prismaMock.coaching.count).toHaveBeenCalledTimes(4);
      expect(prismaMock.coaching.count).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            Estado_Coaching: { Tipo: 'Pendente' },
          }),
        }),
      );
      expect(prismaMock.coaching.count).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          where: expect.objectContaining({
            Estado_Coaching: { Tipo: 'Realizada' },
          }),
        }),
      );
    });
  });

  describe('getAlunoDetalhes', () => {
    it('deve devolver os detalhes do aluno e encarregado', async () => {
      prismaMock.aluno.findUnique.mockResolvedValue({
        ID_aluno: 7,
        Nome: 'Aluno Teste',
        Data_Nascimento: new Date('2015-04-03T00:00:00.000Z'),
        NIF: '123456789',
        Mail: 'aluno@email.test',
        Contato: '910000000',
        Menor_Idade: true,
        Enc_Educacao: {
          Pessoa: {
            Nome: 'Encarregado Teste',
            Email: 'ee@email.test',
            Contacto: '920000000',
          },
        },
      });

      await expect(service.getAlunoDetalhes(7)).resolves.toEqual({
        idAluno: 7,
        nome: 'Aluno Teste',
        dataNascimento: '2015-04-03',
        nif: '123456789',
        email: 'aluno@email.test',
        contacto: '910000000',
        menorIdade: true,
        encarregado: {
          nome: 'Encarregado Teste',
          email: 'ee@email.test',
          contacto: '920000000',
        },
      });
    });

    it('deve lançar erro quando o aluno não existe', async () => {
      prismaMock.aluno.findUnique.mockResolvedValue(null);

      await expect(service.getAlunoDetalhes(7)).rejects.toThrow(
        'Aluno não encontrado.',
      );
    });
  });

  describe('getMarcacoesProfessor', () => {
    it('deve filtrar por professor quando a role é Professor e mapear marcações', async () => {
      const inicio = new Date('2026-05-05T10:00:00.000Z');
      prismaMock.coaching.findMany.mockResolvedValue([
        {
          ID_Coaching: 3,
          ID_Estado_Coaching: 7,
          Inicio_Coaching: inicio,
          Duracao: 45,
          Sala: { Nome: 'Estúdio A' },
          Estado_Coaching: { Tipo: 'Confirmada' },
          Disponibilidade: { Modalidade: 'Kizomba' },
          Coaching_Aluno: [{ Aluno: { Nome: 'Aluno Um' } }, { Aluno: null }],
          confirmacao_prof: false,
        },
      ]);

      const resultado = await service.getMarcacoesProfessor('Professor', 99);

      expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            Professor: {
              Pessoa: { Utilizador: { ID_Utilizador: 99 } },
            },
          },
          orderBy: { Inicio_Coaching: 'asc' },
        }),
      );
      expect(resultado).toEqual([
        {
          idCoaching: 3,
          idEstadoCoaching: 7,
          dataInicio: inicio,
          duracaoMinutos: 45,
          sala: 'Estúdio A',
          modalidade: 'Kizomba',
          alunos: ['Aluno Um'],
          totalAlunos: 1,
          estado: 'Confirmada',
          confirmacao_prof: false,
        },
      ]);
    });

    it('deve devolver todas as marcações para roles não Professor e aplicar valores por defeito', async () => {
      prismaMock.coaching.findMany.mockResolvedValue([
        {
          ID_Coaching: 4,
          ID_Estado_Coaching: null,
          Inicio_Coaching: null,
          Duracao: null,
          Sala: null,
          Estado_Coaching: null,
          Disponibilidade: null,
          Coaching_Aluno: [],
          confirmacao_prof: true,
        },
      ]);

      const resultado = await service.getMarcacoesProfessor('Coordenador', 1);

      expect(prismaMock.coaching.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          sala: 'Sem sala atribuída',
          modalidade: 'Sem modalidade',
          idEstadoCoaching: null,
          estado: 'Pendente',
          totalAlunos: 0,
        }),
      );
    });
  });

  describe('confirmarSessaoProfessor', () => {
    it('deve lançar NotFoundException quando a sessão não existe', async () => {
      prismaMock.coaching.findUnique.mockResolvedValue(null);

      await expect(service.confirmarSessaoProfessor(12)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.coaching.update).not.toHaveBeenCalled();
    });

    it('deve impedir confirmação de uma sessão futura', async () => {
      const futuro = new Date(Date.now() + 60 * 60 * 1000);
      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Coaching: 12,
        Inicio_Coaching: futuro,
        ID_Estado_Coaching: 1,
        confirmacao_EE: false,
      });

      await expect(service.confirmarSessaoProfessor(12)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.coaching.update).not.toHaveBeenCalled();
    });

    it('deve impedir confirmação de uma sessão já concluída', async () => {
      const passado = new Date(Date.now() - 60 * 60 * 1000);
      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Coaching: 12,
        Inicio_Coaching: passado,
        ID_Estado_Coaching: 13,
        confirmacao_EE: true,
      });

      await expect(service.confirmarSessaoProfessor(12)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.coaching.update).not.toHaveBeenCalled();
    });

    it('deve confirmar pelo professor e concluir quando o encarregado já confirmou', async () => {
      const passado = new Date(Date.now() - 60 * 60 * 1000);
      const sessaoAtualizada = {
        ID_Coaching: 12,
        confirmacao_prof: true,
        ID_Estado_Coaching: 13,
      };

      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Coaching: 12,
        Inicio_Coaching: passado,
        ID_Estado_Coaching: 1,
        confirmacao_EE: true,
      });
      prismaMock.coaching.update.mockResolvedValue(sessaoAtualizada);

      await expect(service.confirmarSessaoProfessor(12)).resolves.toBe(
        sessaoAtualizada,
      );
      expect(prismaMock.coaching.update).toHaveBeenCalledWith({
        where: { ID_Coaching: 12 },
        data: {
          confirmacao_prof: true,
          ID_Estado_Coaching: 13,
        },
      });
    });

    it('deve manter o estado atual quando o encarregado ainda não confirmou', async () => {
      const passado = new Date(Date.now() - 60 * 60 * 1000);

      prismaMock.coaching.findUnique.mockResolvedValue({
        ID_Coaching: 12,
        Inicio_Coaching: passado,
        ID_Estado_Coaching: 8,
        confirmacao_EE: false,
      });
      prismaMock.coaching.update.mockResolvedValue({
        ID_Coaching: 12,
        confirmacao_prof: true,
        ID_Estado_Coaching: 8,
      });

      await service.confirmarSessaoProfessor(12);

      expect(prismaMock.coaching.update).toHaveBeenCalledWith({
        where: { ID_Coaching: 12 },
        data: {
          confirmacao_prof: true,
          ID_Estado_Coaching: 8,
        },
      });
    });
  });
});
