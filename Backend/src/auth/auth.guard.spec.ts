import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    guard = new AuthGuard(
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );

    jest.clearAllMocks();
    configServiceMock.getOrThrow.mockReturnValue('segredo-de-teste');
  });

  const criarContextoFake = (authorizationHeader?: string): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: authorizationHeader,
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('deve permitir acesso quando o token é válido e adicionar o payload ao request.user', async () => {
    const contexto = criarContextoFake('Bearer token-valido');
    const payloadFake = {
      sub: 1,
      username: 'simas',
      role: 'Coordenador',
      idPessoa: 10,
    };

    jwtServiceMock.verifyAsync.mockResolvedValue(payloadFake);

    const resultado = await guard.canActivate(contexto);
    const request = contexto.switchToHttp().getRequest();

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('token-valido', {
      secret: 'segredo-de-teste',
    });
    expect(resultado).toBe(true);
    expect(request.user).toEqual(payloadFake);
  });

  it('deve lançar UnauthorizedException quando o header Authorization não existe', async () => {
    await expect(guard.canActivate(criarContextoFake(undefined))).rejects.toThrow(
      new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
    );
  });

  it('deve lançar UnauthorizedException quando o header Authorization não começa por Bearer', async () => {
    await expect(guard.canActivate(criarContextoFake('Token abc123'))).rejects.toThrow(
      new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
    );
  });

  it('deve lançar UnauthorizedException quando o token está vazio', async () => {
    await expect(guard.canActivate(criarContextoFake('Bearer '))).rejects.toThrow(
      new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
    );
  });

  it('deve lançar UnauthorizedException quando o token é inválido', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

    await expect(guard.canActivate(criarContextoFake('Bearer token-invalido'))).rejects.toThrow(
      new UnauthorizedException('Token inválido ou expirado.'),
    );
  });
});
