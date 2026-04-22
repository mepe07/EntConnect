// Ficheiro: src/auth/auth.guard.spec.ts

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';

// Descreve o conjunto de testes do AuthGuard.
// O objetivo é validar a autenticação por token JWT de forma isolada.
describe('AuthGuard', () => {
    let guard: AuthGuard;

    // Mock do JwtService.
    // Evita validar tokens reais durante os testes unitários.
    const jwtServiceMock = {
        verifyAsync: jest.fn(),
    };

    beforeEach(() => {
        // Cria uma nova instância do guard antes de cada teste.
        guard = new AuthGuard(jwtServiceMock as unknown as JwtService);

        // Limpa o histórico dos mocks para garantir isolamento entre testes.
        jest.clearAllMocks();
    });

    // Helper para criar um ExecutionContext fake.
    // Só mockamos o que o AuthGuard realmente usa:
    // - switchToHttp()
    // - getRequest()
    // - headers
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

        // Simula validação bem sucedida do token.
        jwtServiceMock.verifyAsync.mockResolvedValue(payloadFake);

        const resultado = await guard.canActivate(contexto);

        // Vai buscar o request fake usado pelo guard, para validar se o payload foi anexado.
        const request = contexto.switchToHttp().getRequest();

        expect(jwtServiceMock.verifyAsync).toHaveBeenCalled();
        expect(resultado).toBe(true);
        expect(request.user).toEqual(payloadFake);
    });

    it('deve lançar UnauthorizedException quando o header Authorization não existe', async () => {
        const contexto = criarContextoFake(undefined);

        await expect(guard.canActivate(contexto)).rejects.toThrow(
            new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
        );
    });

    it('deve lançar UnauthorizedException quando o header Authorization não começa por Bearer', async () => {
        const contexto = criarContextoFake('Token abc123');

        await expect(guard.canActivate(contexto)).rejects.toThrow(
            new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
        );
    });

    it('deve lançar UnauthorizedException quando o token está vazio', async () => {
        const contexto = criarContextoFake('Bearer ');

        await expect(guard.canActivate(contexto)).rejects.toThrow(
            new UnauthorizedException('Acesso negado. Precisas de fazer login.'),
        );
    });

    it('deve lançar UnauthorizedException quando o token é inválido', async () => {
        const contexto = criarContextoFake('Bearer token-invalido');

        // Simula falha na verificação do JWT.
        jwtServiceMock.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

        await expect(guard.canActivate(contexto)).rejects.toThrow(
            new UnauthorizedException('Token inválido ou expirado.'),
        );
    });
});