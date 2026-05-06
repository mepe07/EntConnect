import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn(),
    trocarRole: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.resetAllMocks();
  });

  it('deve delegar login no AuthService', async () => {
    const dto = { username: 'user', password: 'pass' };
    const resposta = { access_token: 'token', role: 'Professor' };
    authServiceMock.login.mockResolvedValue(resposta);

    await expect(controller.login(dto)).resolves.toBe(resposta);
    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('deve delegar troca de role no AuthService', async () => {
    const req = { user: { sub: 1, role: 'Professor' } as any };
    const dto = { role: 'Coordenador' as any };
    const resposta = {
      access_token: 'novo-token',
      role: 'Coordenador',
      roles: ['Professor', 'Coordenador'],
    };
    authServiceMock.trocarRole.mockResolvedValue(resposta);

    await expect(controller.trocarRole(req, dto)).resolves.toBe(resposta);
    expect(authServiceMock.trocarRole).toHaveBeenCalledWith(req.user, dto.role);
  });

  it('deve delegar forgotPassword no AuthService', async () => {
    const dto = { email: 'user@email.test' };
    const resposta = { message: 'ok' };
    authServiceMock.forgotPassword.mockResolvedValue(resposta);

    await expect(controller.forgotPassword(dto)).resolves.toBe(resposta);
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('deve delegar resetPassword no AuthService', async () => {
    const dto = { token: 'abc', password: 'nova-password' };
    const resposta = { message: 'ok' };
    authServiceMock.resetPassword.mockResolvedValue(resposta);

    await expect(controller.resetPassword(dto)).resolves.toBe(resposta);
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(dto);
  });
});
