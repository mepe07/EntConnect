import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { MarcacoesService } from './EE/marcacoes.service';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { AgendamentosService } from './professor/Agendamentos.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import {
  ProfessorController,
  UtilizadorController,
} from './utilizador.controller';
import { UtilizadorService } from './utilizador.service';
import { ProfessorService } from './professor/professor.service';

describe('UtilizadorController', () => {
  let controller: UtilizadorController;

  const utilizadorServiceMock = {
    getAllUsers: jest.fn(),
    getAlunosSemEncarregado: jest.fn(),
    getAlunosByEE: jest.fn(),
    findOne: jest.fn(),
    blockUser: jest.fn(),
    unlockUser: jest.fn(),
    getRolesIds: jest.fn(),
    UploadPhoto: jest.fn(),
    getFotoPerfil: jest.fn(),
    RemovePhoto: jest.fn(),
    createUser: jest.fn(),
    getMeusCoachings: jest.fn(),
    updateCargo: jest.fn(),
    deleteUser: jest.fn(),
    updateDadosPessoais: jest.fn(),
    mudarPassword: jest.fn(),
    getFaturasEncarregado: jest.fn(),
    criarEducando: jest.fn(),
    atualizarEducando: jest.fn(),
    associarEducando: jest.fn(),
    removerEducando: jest.fn(),
    updatePassword: jest.fn(),
    updatePreferenciasAcoes: jest.fn(),
  };

  const importServiceMock = { importarDeBlob: jest.fn() };
  const disponibilidadeServiceMock = {
    getAvailabilities: jest.fn(),
    criarDisponibilidade: jest.fn(),
    updateAvailability: jest.fn(),
  };
  const marcacoesServiceMock = {
    getMarcacoesbyEE: jest.fn(),
    getConfirmacoesByEE: jest.fn(),
    confirmarSessaoByEE: jest.fn(),
  };
  const blobsServiceMock = {
    lerFicheiroTexto: jest.fn(),
    uploadFicheiro: jest.fn(),
    apagarFicheiro: jest.fn(),
  };
  const agendamentosServiceMock = {
    getAgendamentosProfessor: jest.fn(),
    getConfirmacoesProfessor: jest.fn(),
    atualizarConfirmacaoProfessor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UtilizadorController],
      providers: [
        { provide: UtilizadorService, useValue: utilizadorServiceMock },
        { provide: UtilizadorImportService, useValue: importServiceMock },
        { provide: DispobilidadeService, useValue: disponibilidadeServiceMock },
        { provide: MarcacoesService, useValue: marcacoesServiceMock },
        { provide: BlobsService, useValue: blobsServiceMock },
        { provide: AgendamentosService, useValue: agendamentosServiceMock },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UtilizadorController>(UtilizadorController);
    jest.resetAllMocks();
    [
      ...Object.values(utilizadorServiceMock),
      ...Object.values(importServiceMock),
      ...Object.values(disponibilidadeServiceMock),
      ...Object.values(marcacoesServiceMock),
      ...Object.values(blobsServiceMock),
      ...Object.values(agendamentosServiceMock),
    ].forEach((mock) => mock.mockResolvedValue({ ok: true }));
  });

  it('deve delegar endpoints base de utilizador', async () => {
    await controller.getAllUsers();
    await controller.getAlunosSemEncarregado();
    await controller.findOne(1);
    await controller.blockUser('2');
    await controller.unlockUser('3');
    await controller.getRolesIds(4);
    await controller.createUser({ nome: 'Ana' } as any);
    await controller.getMeusCoachings('5');
    await controller.updateCargo(6, 'Professor', true);
    await controller.deleteUser(7);

    expect(utilizadorServiceMock.blockUser).toHaveBeenCalledWith(2);
    expect(utilizadorServiceMock.unlockUser).toHaveBeenCalledWith(3);
    expect(utilizadorServiceMock.updateCargo).toHaveBeenCalledWith(
      6,
      'Professor',
      true,
    );
  });

  it('deve bloquear gestão de educandos pelo próprio encarregado', async () => {
    await expect(controller.criarMeuEducando()).rejects.toThrow(
      ForbiddenException,
    );
    await expect(controller.atualizarMeuEducando()).rejects.toThrow(
      ForbiddenException,
    );
    await expect(controller.removerMeuEducando()).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve delegar marcações, confirmações, agendamentos e disponibilidades', async () => {
    await controller.getMarcacoesbyEE('10');
    await controller.getConfirmacoesByEE('10');
    await controller.confirmarSessaoByEE('10', 20, 13);
    await controller.getAgendamentosProfessor('30');
    await controller.getConfirmacoesProfessor('30');
    await controller.confirmarSessaoProfessor('30', 40, 14);
    await controller.getDisponibilidades();
    await controller.adicionarDisponibilidade({ ID_Professor: 1 } as any);
    await controller.updateDisponibility('50', {
      EstadoDisponibilidadeID: 1,
    } as any);

    expect(marcacoesServiceMock.confirmarSessaoByEE).toHaveBeenCalledWith(
      10,
      20,
      13,
    );
    expect(
      agendamentosServiceMock.atualizarConfirmacaoProfessor,
    ).toHaveBeenCalledWith(30, 40, 14);
    expect(disponibilidadeServiceMock.updateAvailability).toHaveBeenCalledWith(
      50,
      { EstadoDisponibilidadeID: 1 },
    );
  });

  it('deve importar CSV via blob e limpar ficheiro temporário', async () => {
    const file = {
      originalname: 'users.csv',
      mimetype: 'text/csv',
      size: 10,
    } as Express.Multer.File;

    await controller.importarDoBlob(file);

    expect(blobsServiceMock.uploadFicheiro).toHaveBeenCalledWith(
      'importar-csv',
      file,
      'users',
    );
    expect(importServiceMock.importarDeBlob).toHaveBeenCalledWith('users.csv');
    expect(blobsServiceMock.apagarFicheiro).toHaveBeenCalledWith(
      'importar-csv',
      'users.csv',
    );

    await expect(controller.importarDoBlob(undefined as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve validar upload de foto e atualizar URL', async () => {
    const file = {
      originalname: 'foto.png',
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('x'),
    } as Express.Multer.File;
    blobsServiceMock.uploadFicheiro.mockResolvedValue('https://foto');

    await controller.UploadPhoto('9', file);

    expect(blobsServiceMock.uploadFicheiro).toHaveBeenCalledWith(
      'fotos-pessoas',
      file,
      'user9',
    );
    expect(utilizadorServiceMock.UploadPhoto).toHaveBeenCalledWith(
      'https://foto',
      9,
    );

    await expect(controller.UploadPhoto('9', undefined as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve validar preferências como array e delegar educandos', async () => {
    await controller.updatePreferenciasAcoes(1, [1, 2]);
    await controller.getAlunosByEE('10');
    await controller.criarEducando(10, { nome: 'Aluno' } as any);
    await controller.atualizarEducando(10, 20, { nome: 'Aluno' } as any);
    await controller.associarEducando(10, 20);
    await controller.removerEducando(10, 20);

    expect(utilizadorServiceMock.updatePreferenciasAcoes).toHaveBeenCalledWith(
      1,
      [1, 2],
    );
    expect(utilizadorServiceMock.atualizarEducando).toHaveBeenCalledWith(
      10,
      20,
      { nome: 'Aluno' },
    );
    await expect(
      controller.updatePreferenciasAcoes(1, {} as any),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ProfessorController', () => {
  let controller: ProfessorController;

  const professorServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfessorController],
      providers: [
        { provide: ProfessorService, useValue: professorServiceMock },
      ],
    }).compile();

    controller = module.get<ProfessorController>(ProfessorController);
    jest.resetAllMocks();
  });

  it('deve delegar CRUD de professores', async () => {
    professorServiceMock.create.mockResolvedValue({ ID_Pessoa: 1 });
    professorServiceMock.findAll.mockResolvedValue({ data: [] });
    professorServiceMock.update.mockResolvedValue({ ID_Pessoa: 2 });
    professorServiceMock.remove.mockResolvedValue({ ID_Pessoa: 3 });

    await controller.create({ Nome: 'Ana' } as any);
    await controller.findAll('2');
    await controller.update(2, { Nome: 'Ana 2' } as any);
    await controller.remove(3);

    expect(professorServiceMock.findAll).toHaveBeenCalledWith(2);
    expect(professorServiceMock.update).toHaveBeenCalledWith(2, {
      Nome: 'Ana 2',
    });
  });
});
