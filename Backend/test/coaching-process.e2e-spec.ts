import { Test, TestingModule } from '@nestjs/testing';

import { CoachingService } from '../src/coaching/coaching.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MarcacoesService } from '../src/utilizador/EE/marcacoes.service';
import { DispobilidadeService } from '../src/utilizador/professor/Disponibilidade.service';

type DisponibilidadeRecord = {
  ID_Disponibilidade: number;
  ID_Professor?: number;
  Hora_Inicio?: Date | null;
  EstadoDisponibilidadeID: number;
  DataAtualizacao: Date;
  AlteradoPorUtilizadorID: number;
  Duracao: number;
  Modalidade: string;
  IdEstudio?: number | null;
  MaxAlunos?: number | null;
  ValorPorAluno?: number | null;
};

type CoachingRecord = {
  ID_Coaching: number;
  ID_Professor?: number;
  ID_Estado_Coaching?: number;
  ID_Sala?: number;
  ID_Coordenador?: number;
  ValorPorAluno?: number;
  Inicio_Coaching?: Date;
  Duracao: number;
  ID_Disponibilidade?: number;
  confirmacao_prof: boolean;
  confirmacao_EE: boolean;
};

type CoachingAlunoRecord = {
  ID_Coaching: number;
  ID_Aluno: number;
  Observacoes?: string | null;
  Data_Inscricao: Date;
  ValorEmFalta?: number;
  ID_Enc_Educacao?: number;
  confirmado: boolean;
};

class PrismaCoachingProcessFake {
  private disponibilidadeId = 1;
  private coachingId = 1;

  disponibilidades: DisponibilidadeRecord[] = [];
  coachings: CoachingRecord[] = [];
  coachingAlunos: CoachingAlunoRecord[] = [];

  disponibilidade = {
    create: jest.fn(
      async ({ data }: { data: Partial<DisponibilidadeRecord> }) => {
        const disponibilidade: DisponibilidadeRecord = {
          ID_Disponibilidade: this.disponibilidadeId++,
          ID_Professor: data.ID_Professor,
          Hora_Inicio: data.Hora_Inicio ?? null,
          EstadoDisponibilidadeID: data.EstadoDisponibilidadeID!,
          DataAtualizacao: data.DataAtualizacao!,
          AlteradoPorUtilizadorID: data.AlteradoPorUtilizadorID!,
          Duracao: data.Duracao!,
          Modalidade: data.Modalidade!,
          IdEstudio: data.IdEstudio ?? null,
          MaxAlunos: data.MaxAlunos ?? null,
          ValorPorAluno: data.ValorPorAluno ?? null,
        };

        this.disponibilidades.push(disponibilidade);
        return disponibilidade;
      },
    ),

    count: jest.fn(
      async ({ where }: { where: { ID_Disponibilidade: number } }) =>
        this.disponibilidades.filter(
          (item) => item.ID_Disponibilidade === where.ID_Disponibilidade,
        ).length,
    ),

    findUnique: jest.fn(
      async ({
        where,
        select,
      }: {
        where: { ID_Disponibilidade: number };
        select?: object;
      }) => {
        const disponibilidade = this.disponibilidades.find(
          (item) => item.ID_Disponibilidade === where.ID_Disponibilidade,
        );

        if (!disponibilidade) {
          return null;
        }

        if (select && 'MaxAlunos' in select) {
          return { MaxAlunos: disponibilidade.MaxAlunos };
        }

        return disponibilidade;
      },
    ),

    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { ID_Disponibilidade: number };
        data: any;
      }) => {
        const disponibilidade = this.disponibilidades.find(
          (item) => item.ID_Disponibilidade === where.ID_Disponibilidade,
        );

        if (!disponibilidade) {
          throw new Error('Disponibilidade nao encontrada.');
        }

        const { MaxAlunos, ...camposDiretos } = data;
        Object.assign(disponibilidade, camposDiretos);

        if (MaxAlunos?.decrement) {
          disponibilidade.MaxAlunos =
            (disponibilidade.MaxAlunos ?? 0) - MaxAlunos.decrement;
        }

        if (MaxAlunos?.increment) {
          disponibilidade.MaxAlunos =
            (disponibilidade.MaxAlunos ?? 0) + MaxAlunos.increment;
        }

        if (MaxAlunos !== undefined && typeof MaxAlunos === 'number') {
          disponibilidade.MaxAlunos = MaxAlunos;
        }

        return disponibilidade;
      },
    ),

    findMany: jest.fn(async () =>
      this.disponibilidades.map((disp) => ({
        ...disp,
        Professor: { Pessoa: { Nome: 'Professor Teste' } },
        Estado_Disponibilidade: {
          Tipo:
            disp.EstadoDisponibilidadeID === 1
              ? 'Aprovado'
              : disp.EstadoDisponibilidadeID === 2
                ? 'Pendente'
                : 'Rejeitado',
        },
        Utilizador: { Pessoa: { Nome: 'Coordenacao Teste' } },
        Coaching: this.coachings
          .filter(
            (coaching) =>
              coaching.ID_Disponibilidade === disp.ID_Disponibilidade,
          )
          .map((coaching) => ({
            Coaching_Aluno: this.coachingAlunos.filter(
              (aluno) => aluno.ID_Coaching === coaching.ID_Coaching,
            ),
          })),
      })),
    ),
  };

  coaching = {
    findFirst: jest.fn(
      async ({ where }: { where: Partial<CoachingRecord> }) =>
        this.coachings.find((coaching) =>
          Object.entries(where).every(
            ([key, value]) => coaching[key as keyof CoachingRecord] === value,
          ),
        ) ?? null,
    ),

    findUnique: jest.fn(
      async ({ where }: { where: { ID_Coaching: number } }) =>
        this.coachings.find(
          (coaching) => coaching.ID_Coaching === where.ID_Coaching,
        ) ?? null,
    ),

    create: jest.fn(async ({ data }: { data: Partial<CoachingRecord> }) => {
      const coaching: CoachingRecord = {
        ID_Coaching: this.coachingId++,
        ID_Professor: data.ID_Professor,
        ID_Estado_Coaching: data.ID_Estado_Coaching,
        ID_Sala: data.ID_Sala,
        ID_Coordenador: data.ID_Coordenador,
        ValorPorAluno: data.ValorPorAluno,
        Inicio_Coaching: data.Inicio_Coaching,
        Duracao: data.Duracao ?? 0,
        ID_Disponibilidade: data.ID_Disponibilidade,
        confirmacao_prof: false,
        confirmacao_EE: false,
      };

      this.coachings.push(coaching);
      return coaching;
    }),

    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { ID_Coaching: number };
        data: Partial<CoachingRecord>;
      }) => {
        const coaching = this.coachings.find(
          (item) => item.ID_Coaching === where.ID_Coaching,
        );

        if (!coaching) {
          throw new Error('Coaching nao encontrado.');
        }

        Object.assign(coaching, data);
        return coaching;
      },
    ),
  };

  coaching_Aluno = {
    create: jest.fn(
      async ({ data }: { data: Partial<CoachingAlunoRecord> }) => {
        const inscricao: CoachingAlunoRecord = {
          ID_Coaching: data.ID_Coaching!,
          ID_Aluno: data.ID_Aluno!,
          Observacoes: data.Observacoes ?? null,
          Data_Inscricao: data.Data_Inscricao ?? new Date(),
          ValorEmFalta: data.ValorEmFalta,
          ID_Enc_Educacao: data.ID_Enc_Educacao,
          confirmado: false,
        };

        this.coachingAlunos.push(inscricao);
        return inscricao;
      },
    ),

    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: Partial<CoachingAlunoRecord>;
        data: Partial<CoachingAlunoRecord>;
      }) => {
        const matches = this.coachingAlunos.filter((inscricao) =>
          Object.entries(where).every(
            ([key, value]) =>
              inscricao[key as keyof CoachingAlunoRecord] === value,
          ),
        );

        matches.forEach((inscricao) => Object.assign(inscricao, data));
        return { count: matches.length };
      },
    ),

    count: jest.fn(
      async ({ where }: { where: Partial<CoachingAlunoRecord> }) =>
        this.coachingAlunos.filter((inscricao) =>
          Object.entries(where).every(
            ([key, value]) =>
              inscricao[key as keyof CoachingAlunoRecord] === value,
          ),
        ).length,
    ),
  };
}

describe('Processo de coaching (integração)', () => {
  let disponibilidadeService: DispobilidadeService;
  let coachingService: CoachingService;
  let marcacoesService: MarcacoesService;
  let prisma: PrismaCoachingProcessFake;

  beforeEach(async () => {
    prisma = new PrismaCoachingProcessFake();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispobilidadeService,
        CoachingService,
        MarcacoesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    disponibilidadeService = module.get(DispobilidadeService);
    coachingService = module.get(CoachingService);
    marcacoesService = module.get(MarcacoesService);
  });

  it('cobre o fluxo: disponibilidade, aprovação, inscrição do educando e confirmações da sessão', async () => {
    const disponibilidadeCriada =
      await disponibilidadeService.criarDisponibilidade({
        ID_Professor: 101,
        AlteradoPorUtilizadorID: 301,
        Hora_Inicio: '2026-05-10T09:00:00.000Z',
        Duracao: 60,
        MaxAlunos: 2,
        Modalidade: 'Ballet',
      });

    expect(disponibilidadeCriada.disponibilidade).toEqual(
      expect.objectContaining({
        EstadoDisponibilidadeID: 2,
        IdEstudio: null,
        ValorPorAluno: null,
        MaxAlunos: 2,
      }),
    );

    const disponibilidadeAprovada =
      await disponibilidadeService.updateAvailability(
        disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
        {
          EstadoDisponibilidadeID: 1,
          IdEstudio: 501,
          ValorPorAluno: 25,
        },
      );

    expect(disponibilidadeAprovada.disponibilidade).toEqual(
      expect.objectContaining({
        EstadoDisponibilidadeID: 1,
        IdEstudio: 501,
        ValorPorAluno: 25,
      }),
    );

    const oferta = await disponibilidadeService.getAvailabilities();
    expect(oferta).toContainEqual(
      expect.objectContaining({
        idDisponibilidade:
          disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
        estado: 'Aprovado',
        modalidade: 'Ballet',
        idEstudio: 501,
        valorPorAluno: 25,
        alunosInscritosIds: [],
      }),
    );

    const inscricao = await coachingService.inscreverAluno(
      disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
      {
        idAluno: 401,
        idEncEducacao: 201,
        idProfessor: 101,
        idEstadoCoaching: 7,
        idSala: 501,
        idCoordenador: 301,
        valorPorAluno: 25,
        inicio_Coaching: '2026-05-01T09:00:00.000Z',
        duracao: 60,
        obs: 'Primeira sessão',
        valorEmFalta: 25,
      },
    );

    expect(inscricao).toEqual({
      message: 'Aluno inscrito com sucesso!',
      inscricao: expect.objectContaining({
        ID_Aluno: 401,
        ID_Enc_Educacao: 201,
        ValorEmFalta: 25,
      }),
    });

    const sessao = prisma.coachings[0];
    expect(sessao).toEqual(
      expect.objectContaining({
        ID_Professor: 101,
        ID_Estado_Coaching: 7,
        ID_Sala: 501,
        ID_Coordenador: 301,
        ID_Disponibilidade:
          disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
        confirmacao_prof: false,
        confirmacao_EE: false,
      }),
    );
    expect(prisma.disponibilidades[0].MaxAlunos).toBe(1);

    await expect(
      marcacoesService.confirmarSessaoByEE(201, sessao.ID_Coaching, 13),
    ).resolves.toEqual({
      message:
        'Confirmação do encarregado registada. A aguardar confirmação do professor.',
    });

    expect(prisma.coachingAlunos[0]).toEqual(
      expect.objectContaining({ confirmado: true }),
    );
    expect(prisma.coachings[0]).toEqual(
      expect.objectContaining({
        ID_Estado_Coaching: 7,
        confirmacao_EE: true,
        confirmacao_prof: false,
      }),
    );

    await coachingService.confirmarSessaoProfessor(sessao.ID_Coaching);

    expect(prisma.coachings[0]).toEqual(
      expect.objectContaining({
        ID_Estado_Coaching: 13,
        confirmacao_EE: true,
        confirmacao_prof: true,
      }),
    );
  });

  it('só conclui a sessão quando professor e EE confirmam realização', async () => {
    const disponibilidadeCriada =
      await disponibilidadeService.criarDisponibilidade({
        ID_Professor: 101,
        AlteradoPorUtilizadorID: 301,
        Hora_Inicio: '2026-05-10T09:00:00.000Z',
        Duracao: 60,
        MaxAlunos: 1,
        Modalidade: 'Ballet',
      });

    await disponibilidadeService.updateAvailability(
      disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
      {
        EstadoDisponibilidadeID: 1,
        IdEstudio: 501,
        ValorPorAluno: 25,
      },
    );

    await coachingService.inscreverAluno(
      disponibilidadeCriada.disponibilidade.ID_Disponibilidade,
      {
        idAluno: 401,
        idEncEducacao: 201,
        idProfessor: 101,
        idEstadoCoaching: 7,
        idSala: 501,
        idCoordenador: 301,
        valorPorAluno: 25,
        inicio_Coaching: '2026-05-01T09:00:00.000Z',
        duracao: 60,
        valorEmFalta: 25,
      },
    );

    const sessao = prisma.coachings[0];

    await coachingService.confirmarSessaoProfessor(sessao.ID_Coaching);

    expect(prisma.coachings[0]).toEqual(
      expect.objectContaining({
        ID_Estado_Coaching: 7,
        confirmacao_prof: true,
        confirmacao_EE: false,
      }),
    );

    await marcacoesService.confirmarSessaoByEE(201, sessao.ID_Coaching, 13);

    expect(prisma.coachings[0]).toEqual(
      expect.objectContaining({
        ID_Estado_Coaching: 13,
        confirmacao_EE: true,
        confirmacao_prof: true,
      }),
    );
  });
});
