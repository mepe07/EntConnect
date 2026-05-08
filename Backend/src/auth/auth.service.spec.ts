import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './enums/roles.enum';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    utilizador: {
      findUnique: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  const criarLoginDto = (): LoginDto => ({
    username: 'simas',
    password: '123456',
  });

  const criarUtilizadorFake = (override = {}) => ({
    ID_Utilizador: 1,
    Utilizador: 'simas',
    Password: 'hash-da-password',
    Ativo: true,
    ID_Pessoa: 10,
    Acoes_Rapidas: null,
    Pessoa: {
      Nome: 'Simao Silva',
      Professor: null,
      Coordenador: { ID_Pessoa: 10 },
      Enc_Educacao: null,
    },
    ...override,
  });

  it('deve fazer login com sucesso quando as credenciais são válidas e o utilizador está ativo', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake();

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(prismaMock.utilizador.findUnique).toHaveBeenCalledWith({
      where: { Utilizador: loginDto.username },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      loginDto.password,
      utilizador.Password,
    );

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: utilizador.ID_Utilizador,
      username: utilizador.Utilizador,
      nome: utilizador.Pessoa.Nome,
      role: Role.COORDENADOR,
      roles: [Role.COORDENADOR],
      idPessoa: utilizador.ID_Pessoa,
      Acoes_Rapidas: null,
    });

    expect(resultado).toEqual({
      access_token: 'fake-jwt-token',
      role: Role.COORDENADOR,
      roles: [Role.COORDENADOR],
    });
  });

  it('deve incluir todas as roles do utilizador e escolher a role padrao', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Nome: 'Simao Silva',
        Professor: { ID_Pessoa: 10 },
        Coordenador: { ID_Pessoa: 10 },
        Enc_Educacao: { ID_Pessoa: 10 },
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.PROFESSOR,
        roles: [Role.PROFESSOR, Role.COORDENADOR, Role.ENC_EDUCACAO],
      }),
    );
    expect(resultado).toEqual({
      access_token: 'fake-jwt-token',
      role: Role.PROFESSOR,
      roles: [Role.PROFESSOR, Role.COORDENADOR, Role.ENC_EDUCACAO],
    });
  });

  it('deve escolher a role preferida no login quando pertence ao utilizador', async () => {
    const loginDto: LoginDto = {
      ...criarLoginDto(),
      rolePreferida: Role.COORDENADOR,
    };
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Nome: 'Simao Silva',
        Professor: { ID_Pessoa: 10 },
        Coordenador: { ID_Pessoa: 10 },
        Enc_Educacao: null,
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.COORDENADOR,
        roles: [Role.PROFESSOR, Role.COORDENADOR],
      }),
    );
    expect(resultado).toEqual({
      access_token: 'fake-jwt-token',
      role: Role.COORDENADOR,
      roles: [Role.PROFESSOR, Role.COORDENADOR],
    });
  });

  it('deve ignorar a role preferida no login quando nao pertence ao utilizador', async () => {
    const loginDto: LoginDto = {
      ...criarLoginDto(),
      rolePreferida: Role.COORDENADOR,
    };
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Nome: 'Simao Silva',
        Professor: { ID_Pessoa: 10 },
        Coordenador: null,
        Enc_Educacao: null,
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.PROFESSOR,
        roles: [Role.PROFESSOR],
      }),
    );
    expect(resultado.role).toBe(Role.PROFESSOR);
  });

  it('deve lançar erro quando o utilizador não existe', async () => {
    const loginDto = criarLoginDto();

    prismaMock.utilizador.findUnique.mockResolvedValue(null);

    await expect(service.login(loginDto)).rejects.toThrow(
      new UnauthorizedException('Os dados introduzidos estão inválidos.'),
    );
  });

  it('deve lançar erro quando a password está errada', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake();

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login(loginDto)).rejects.toThrow(
      new UnauthorizedException('Os dados introduzidos estão inválidos.'),
    );
  });

  it('deve lançar erro específico quando o utilizador está inativo', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake({ Ativo: false });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(service.login(loginDto)).rejects.toThrow(
      new UnauthorizedException(
        'A sua conta está inativa. Contacte a coordenação.',
      ),
    );
  });

  it('deve devolver a role PROFESSOR quando o utilizador tem perfil de professor', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Professor: { ID_Pessoa: 10 },
        Coordenador: null,
        Enc_Educacao: null,
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(resultado.role).toBe(Role.PROFESSOR);
  });

  it('deve devolver a role ENC_EDUCACAO quando o utilizador tem perfil de encarregado de educação', async () => {
    const loginDto = criarLoginDto();
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Professor: null,
        Coordenador: null,
        Enc_Educacao: { ID_Pessoa: 10 },
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const resultado = await service.login(loginDto);

    expect(resultado.role).toBe(Role.ENC_EDUCACAO);
  });

  it('deve trocar a role ativa quando a role pertence ao utilizador', async () => {
    const utilizador = criarUtilizadorFake({
      Pessoa: {
        Nome: 'Simao Silva',
        Professor: { ID_Pessoa: 10 },
        Coordenador: { ID_Pessoa: 10 },
        Enc_Educacao: null,
      },
    });

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
    jwtServiceMock.signAsync.mockResolvedValue('novo-token');

    const resultado = await service.trocarRole(
      {
        sub: utilizador.ID_Utilizador,
        username: utilizador.Utilizador,
        nome: utilizador.Pessoa.Nome,
        role: Role.PROFESSOR,
        roles: [Role.PROFESSOR, Role.COORDENADOR],
        idPessoa: utilizador.ID_Pessoa,
      },
      Role.COORDENADOR,
    );

    expect(prismaMock.utilizador.findUnique).toHaveBeenCalledWith({
      where: { ID_Utilizador: utilizador.ID_Utilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Enc_Educacao: true,
          },
        },
      },
    });
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.COORDENADOR,
        roles: [Role.PROFESSOR, Role.COORDENADOR],
      }),
    );
    expect(resultado).toEqual({
      access_token: 'novo-token',
      role: Role.COORDENADOR,
      roles: [Role.PROFESSOR, Role.COORDENADOR],
    });
  });

  it('deve rejeitar troca para role nao associada ao utilizador', async () => {
    const utilizador = criarUtilizadorFake();

    prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);

    await expect(
      service.trocarRole(
        {
          sub: utilizador.ID_Utilizador,
          username: utilizador.Utilizador,
          nome: utilizador.Pessoa.Nome,
          role: Role.COORDENADOR,
          roles: [Role.COORDENADOR],
          idPessoa: utilizador.ID_Pessoa,
        },
        Role.PROFESSOR,
      ),
    ).rejects.toThrow(
      new UnauthorizedException(
        'A role selecionada nÃ£o estÃ¡ associada ao utilizador.',
      ),
    );
  });
});
