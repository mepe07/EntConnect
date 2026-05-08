import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorService } from './utilizador.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UtilizadorService', () => {
  let service: UtilizadorService;

  const prismaMock = {
    utilizador: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pessoa: { update: jest.fn(), delete: jest.fn() },
    aluno: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    enc_Educacao: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    professor: { create: jest.fn(), delete: jest.fn() },
    coordenador: { create: jest.fn(), delete: jest.fn() },
    coaching: { findMany: jest.fn() },
    coaching_Aluno: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilizadorService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UtilizadorService>(UtilizadorService);
    jest.resetAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.$transaction.mockResolvedValue([0, 0]);
  });

  it('deve mapear utilizadores e cargo', async () => {
    prismaMock.utilizador.findMany.mockResolvedValue([
      {
        ID_Utilizador: 1,
        ID_Pessoa: 10,
        Utilizador: 'ana',
        Ativo: true,
        Pessoa: {
          Nome: 'Ana',
          Email: 'ana@test',
          Contacto: '910',
          NIF: '123',
          Professor: {},
          Coordenador: null,
          Enc_Educacao: null,
        },
      },
    ]);

    await expect(service.getAllUsers()).resolves.toEqual([
      expect.objectContaining({
        idUtilizador: 1,
        cargo: 'Professor',
        nome: 'Ana',
      }),
    ]);
  });

  it('deve criar utilizador e rejeitar duplicados', async () => {
    const dto = {
      nome: 'Ana',
      username: 'ana',
      email: 'ana@test',
      contacto: '910',
      nif: '123',
      dataNascimento: '1990-01-01',
      cargo: 'Professor',
      password: 'pass',
    };
    prismaMock.utilizador.findFirst.mockResolvedValueOnce(null);
    prismaMock.utilizador.create.mockResolvedValue({
      ID_Utilizador: 1,
      Utilizador: 'ana',
    });

    await expect(service.createUser(dto)).resolves.toEqual({
      id: 1,
      username: 'ana',
      mensagem: 'Utilizador "Ana" criado com sucesso.',
    });

    prismaMock.utilizador.findFirst.mockResolvedValueOnce({ ID_Utilizador: 1 });
    await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
  });

  it('deve obter roles ids e rejeitar utilizador inexistente', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValueOnce({
      ID_Pessoa: 10,
      Pessoa: {
        Professor: { ID_Pessoa: 10 },
        Enc_Educacao: null,
        Coordenador: null,
      },
    });

    await expect(service.getRolesIds(1)).resolves.toEqual({
      idProfessor: 10,
      idEncEducacao: null,
      idCoordenador: null,
      idPessoaBase: 10,
    });

    prismaMock.utilizador.findUnique.mockResolvedValueOnce(null);
    await expect(service.getRolesIds(2)).rejects.toThrow(NotFoundException);
  });

  it('deve bloquear, desbloquear e atualizar password', async () => {
    prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 });
    prismaMock.utilizador.findUnique.mockResolvedValue({
      ID_Utilizador: 1,
      Password: 'old',
    });

    await service.blockUser(1);
    await service.unlockUser(1);
    await service.updatePassword(1, 'nova');

    expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
      where: { ID_Utilizador: 1 },
      data: { Ativo: false },
    });
    expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
      where: { ID_Utilizador: 1 },
      data: { Ativo: true },
    });
    expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
      where: { ID_Utilizador: 1 },
      data: { Password: 'hash' },
    });
  });

  it('deve gerir foto de perfil', async () => {
    prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 });
    prismaMock.utilizador.findUnique
      .mockResolvedValueOnce({ ID_Pessoa: 10 })
      .mockResolvedValueOnce({ Pessoa: { Foto: 'foto.jpg' } });
    prismaMock.pessoa.update.mockResolvedValue({ ID_Pessoa: 10, Foto: null });

    await service.UploadPhoto('url', 1);
    await service.RemovePhoto(1);
    await expect(service.getFotoPerfil(1)).resolves.toEqual({
      id: 1,
      url: 'foto.jpg',
      mensagem: 'Foto encontrada.',
    });
  });

  it('deve mudar password validando password atual', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue({
      ID_Utilizador: 1,
      Password: 'hash-antiga',
    });

    await expect(
      service.mudarPassword(1, { passAtual: 'a', passNova: 'b' }),
    ).resolves.toEqual({
      message: 'Password alterada com sucesso!',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.mudarPassword(1, { passAtual: 'errada', passNova: 'b' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve gerir educandos do encarregado', async () => {
    prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
    prismaMock.aluno.findMany.mockResolvedValue([]);
    prismaMock.aluno.create.mockResolvedValue({ ID_aluno: 1 });
    prismaMock.aluno.findFirst.mockResolvedValue({
      ID_aluno: 1,
      ID_Enc_Educacao: 10,
    });
    prismaMock.aluno.update.mockResolvedValue({ ID_aluno: 1 });

    await service.getAlunosByEE(10);
    await service.getAlunosSemEncarregado();
    await service.criarEducando(10, {
      nome: 'Aluno',
      dataNascimento: '2015-01-01',
      nif: '1',
    } as any);
    await service.atualizarEducando(10, 1, {
      nome: 'Aluno 2',
      dataNascimento: '2015-01-01',
      nif: '1',
    } as any);
    await expect(service.removerEducando(10, 1)).resolves.toEqual({
      mensagem: 'Educando removido do encarregado de educacao com sucesso.',
    });
  });

  it('deve associar educando sem encarregado e rejeitar aluno já associado', async () => {
    prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
    prismaMock.aluno.findUnique.mockResolvedValueOnce({
      ID_aluno: 1,
      ID_Enc_Educacao: null,
    });
    prismaMock.aluno.update.mockResolvedValue({
      ID_aluno: 1,
      ID_Enc_Educacao: 10,
    });

    await expect(service.associarEducando(10, 1)).resolves.toEqual({
      ID_aluno: 1,
      ID_Enc_Educacao: 10,
    });

    prismaMock.aluno.findUnique.mockResolvedValueOnce({
      ID_aluno: 1,
      ID_Enc_Educacao: 99,
    });
    await expect(service.associarEducando(10, 1)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deve atualizar cargo e eliminar utilizador', async () => {
    prismaMock.utilizador.findUnique
      .mockResolvedValueOnce({
        ID_Pessoa: 10,
        Pessoa: {
          Professor: {},
          Coordenador: null,
          Enc_Educacao: null,
        },
      })
      .mockResolvedValueOnce({
        ID_Pessoa: 10,
        Pessoa: {
          Professor: {},
          Coordenador: null,
          Enc_Educacao: null,
        },
      });

    await expect(service.updateCargo(1, 'Coordenador')).resolves.toEqual({
      mensagem: 'Cargo atualizado para "Coordenador" com sucesso.',
    });
    await expect(service.deleteUser(1)).resolves.toEqual({
      mensagem: 'Utilizador eliminado com sucesso.',
    });
  });

  it('deve ignorar Sem Cargo ao atualizar cargos de utilizador sem roles', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue({
      ID_Pessoa: 10,
      Pessoa: {
        Professor: null,
        Coordenador: null,
        Enc_Educacao: null,
      },
    });

    await expect(
      service.updateCargos(1, ['Sem Cargo', 'Professor']),
    ).resolves.toEqual({
      mensagem: 'Cargos atualizados para "Professor" com sucesso.',
      cargos: ['Professor'],
    });
    expect(prismaMock.professor.create).toHaveBeenCalledWith({
      data: { ID_Pessoa: 10 },
    });
  });

  it('deve rejeitar Sem Cargo quando nao ha nenhum cargo real selecionado', async () => {
    await expect(service.updateCargos(1, 'Sem Cargo')).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.utilizador.findUnique).not.toHaveBeenCalled();
  });

  it('deve devolver faturas do encarregado', async () => {
    prismaMock.utilizador.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
    prismaMock.coaching_Aluno.findMany.mockResolvedValue([
      {
        Data_Inscricao: new Date('2026-05-01'),
        ValorEmFalta: 20,
        Observacoes: null,
        Aluno: { Nome: 'Aluno' },
        Coaching: { Disponibilidade: { Modalidade: 'Salsa' } },
      },
    ]);

    await expect(service.getFaturasEncarregado(1)).resolves.toEqual([
      expect.objectContaining({
        Descricao: 'Salsa - Aluno',
        Valor: 20,
        Pago: false,
      }),
    ]);
  });
});
