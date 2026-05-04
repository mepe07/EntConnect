import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { GestaoEstudiosService } from './estudios/gestaoEstudios.service';
import { ModalidadeService } from './modalidade/modalidade.service';

describe('CoachingController', () => {
  let controller: CoachingController;

  const coachingServiceMock = {
    create: jest.fn(),
    removerAluno: jest.fn(),
    inscreverAluno: jest.fn(),
    getSessoesFuturasAdmin: jest.fn(),
    getKpisAdmin: jest.fn(),
    getAlunoDetalhes: jest.fn(),
    getMarcacoesProfessor: jest.fn(),
    confirmarSessaoProfessor: jest.fn(),
  };

  const gestaoEstudiosServiceMock = {
    getAllStudios: jest.fn(),
    lockStudio: jest.fn(),
    unlockStudio: jest.fn(),
  };

  const modalidadeServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachingController],
      providers: [
        {
          provide: CoachingService,
          useValue: coachingServiceMock,
        },
        {
          provide: GestaoEstudiosService,
          useValue: gestaoEstudiosServiceMock,
        },
        {
          provide: ModalidadeService,
          useValue: modalidadeServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CoachingController>(CoachingController);
    jest.resetAllMocks();
  });

  const criarBearerTokenFake = (payload: Record<string, unknown>) => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

    return `Bearer ${header}.${body}.signature`;
  };

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve delegar a criação de coaching no service', async () => {
    const dto = { ID_Professor: 1, ID_Sala: 2 } as any;
    const resposta = { ID_Coaching: 10 };
    coachingServiceMock.create.mockResolvedValue(resposta);

    await expect(controller.create(dto)).resolves.toBe(resposta);
    expect(coachingServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('deve delegar a remoção de aluno no service', async () => {
    const resposta = { message: 'Aluno removido com sucesso!' };
    coachingServiceMock.removerAluno.mockResolvedValue(resposta);

    await expect(controller.removerAluno(5, 10)).resolves.toBe(resposta);
    expect(coachingServiceMock.removerAluno).toHaveBeenCalledWith(5, 10);
  });

  it('deve converter o id da disponibilidade e delegar a inscrição de aluno', async () => {
    const body = { idAluno: 7 } as any;
    const resposta = { message: 'Aluno inscrito com sucesso!' };
    coachingServiceMock.inscreverAluno.mockResolvedValue(resposta);

    await expect(controller.inscreverAluno('50', body)).resolves.toBe(resposta);
    expect(coachingServiceMock.inscreverAluno).toHaveBeenCalledWith(50, body);
  });

  it('deve listar estúdios através do service de gestão de estúdios', async () => {
    const estudios = [{ ID_Sala: 1, Nome: 'Estúdio A' }];
    gestaoEstudiosServiceMock.getAllStudios.mockResolvedValue(estudios);

    await expect(controller.getAllStudios()).resolves.toBe(estudios);
    expect(gestaoEstudiosServiceMock.getAllStudios).toHaveBeenCalled();
  });

  it('deve converter o id e bloquear um estúdio', async () => {
    const resposta = { message: 'Estúdio bloqueado.' };
    gestaoEstudiosServiceMock.lockStudio.mockResolvedValue(resposta);

    await expect(controller.lockStudio('3')).resolves.toBe(resposta);
    expect(gestaoEstudiosServiceMock.lockStudio).toHaveBeenCalledWith(3);
  });

  it('deve converter o id e desbloquear um estúdio', async () => {
    const resposta = { message: 'Estúdio desbloqueado.' };
    gestaoEstudiosServiceMock.unlockStudio.mockResolvedValue(resposta);

    await expect(controller.unlockStudio('3')).resolves.toBe(resposta);
    expect(gestaoEstudiosServiceMock.unlockStudio).toHaveBeenCalledWith(3);
  });

  it('deve delegar a obtenção de sessões futuras de admin', async () => {
    const resposta = [{ idCoaching: 1 }];
    coachingServiceMock.getSessoesFuturasAdmin.mockResolvedValue(resposta);

    await expect(controller.getSessoesFuturasAdmin()).resolves.toBe(resposta);
    expect(coachingServiceMock.getSessoesFuturasAdmin).toHaveBeenCalled();
  });

  it('deve delegar a obtenção dos KPIs de admin', async () => {
    const resposta = { marcadas: 2 };
    coachingServiceMock.getKpisAdmin.mockResolvedValue(resposta);

    await expect(controller.getKpisAdmin()).resolves.toBe(resposta);
    expect(coachingServiceMock.getKpisAdmin).toHaveBeenCalled();
  });

  it('deve delegar os detalhes do aluno no service', async () => {
    const resposta = { idAluno: 9, nome: 'Aluno' };
    coachingServiceMock.getAlunoDetalhes.mockResolvedValue(resposta);

    await expect(controller.getAlunoDetalhes(9)).resolves.toBe(resposta);
    expect(coachingServiceMock.getAlunoDetalhes).toHaveBeenCalledWith(9);
  });

  it('deve descodificar o token e obter marcações do utilizador', async () => {
    const resposta = [{ idCoaching: 1 }];
    const token = criarBearerTokenFake({ role: 'Professor', sub: 99 });
    coachingServiceMock.getMarcacoesProfessor.mockResolvedValue(resposta);

    await expect(controller.getMarcacoes(token)).resolves.toBe(resposta);
    expect(coachingServiceMock.getMarcacoesProfessor).toHaveBeenCalledWith(
      'Professor',
      99,
    );
  });

  it('deve rejeitar obtenção de marcações sem bearer token', async () => {
    await expect(controller.getMarcacoes('')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(controller.getMarcacoes('Token abc')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(coachingServiceMock.getMarcacoesProfessor).not.toHaveBeenCalled();
  });

  it('deve rejeitar obtenção de marcações com token corrompido', async () => {
    await expect(
      controller.getMarcacoes('Bearer token-invalido'),
    ).rejects.toThrow(UnauthorizedException);
    expect(coachingServiceMock.getMarcacoesProfessor).not.toHaveBeenCalled();
  });

  it('deve delegar a confirmação da sessão pelo professor', async () => {
    const resposta = { ID_Coaching: 4, confirmacao_prof: true };
    coachingServiceMock.confirmarSessaoProfessor.mockResolvedValue(resposta);

    await expect(controller.confirmarProfessor(4)).resolves.toBe(resposta);
    expect(coachingServiceMock.confirmarSessaoProfessor).toHaveBeenCalledWith(
      4,
    );
  });
});
