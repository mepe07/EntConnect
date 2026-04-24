// Ficheiro: src/auth/guards/roles.guard.spec.ts

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { Role } from '../enums/roles.enum';
import { UtilizadorAutenticado } from '../../common/interfaces/utilizador-autenticado.interface';

describe('RolesGuard', () => {
    let guard: RolesGuard;

    // Mock do Reflector usado pelo guard para ler o metadata definido pelo @Roles(...).
    const reflectorMock = {
        getAllAndOverride: jest.fn(),
    };

    beforeEach(() => {
        guard = new RolesGuard(reflectorMock as unknown as Reflector);

        // Garante que cada teste começa sem histórico de chamadas do mock.
        jest.clearAllMocks();
    });

    // Helper para criar um utilizador autenticado fake.
    const criarUtilizadorFake = (
        role: Role = Role.COORDENADOR,
    ): UtilizadorAutenticado => ({
        sub: 1,
        username: 'simas',
        role,
        idPessoa: 10,
    });

    // Helper para criar um ExecutionContext fake.
    // Só mockamos o que o RolesGuard realmente usa.
    const criarContextoFake = (user?: UtilizadorAutenticado): ExecutionContext =>
        ({
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    user,
                }),
            }),
        }) as unknown as ExecutionContext;

    it('deve permitir acesso quando o endpoint não define roles', () => {
        const contexto = criarContextoFake(criarUtilizadorFake(Role.COORDENADOR));

        // Simula um endpoint sem @Roles(...).
        reflectorMock.getAllAndOverride.mockReturnValue(undefined);

        const resultado = guard.canActivate(contexto);

        expect(reflectorMock.getAllAndOverride).toHaveBeenCalled();
        expect(resultado).toBe(true);
    });

    it('deve permitir acesso quando a role do utilizador está nas roles permitidas', () => {
        const contexto = criarContextoFake(criarUtilizadorFake(Role.COORDENADOR));

        // Simula um endpoint que só permite Coordenador.
        reflectorMock.getAllAndOverride.mockReturnValue([Role.COORDENADOR]);

        const resultado = guard.canActivate(contexto);

        expect(resultado).toBe(true);
    });

    it('deve lançar ForbiddenException quando a role do utilizador não tem permissão', () => {
        const contexto = criarContextoFake(criarUtilizadorFake(Role.PROFESSOR));

        // Simula um endpoint exclusivo para Coordenador.
        reflectorMock.getAllAndOverride.mockReturnValue([Role.COORDENADOR]);

        expect(() => guard.canActivate(contexto)).toThrow(
            new ForbiddenException('Sem permissões para aceder a este endpoint.'),
        );
    });

    it('deve lançar ForbiddenException quando não existe utilizador no request', () => {
        const contexto = criarContextoFake(undefined);

        // Simula um endpoint com restrição de role.
        reflectorMock.getAllAndOverride.mockReturnValue([Role.COORDENADOR]);

        expect(() => guard.canActivate(contexto)).toThrow(
            new ForbiddenException('Utilizador não autenticado.'),
        );
    });

    it('deve permitir acesso quando existem várias roles permitidas e a role do utilizador coincide com uma delas', () => {
        const contexto = criarContextoFake(criarUtilizadorFake(Role.PROFESSOR));

        // Simula um endpoint acessível por Coordenador ou Professor.
        reflectorMock.getAllAndOverride.mockReturnValue([
            Role.COORDENADOR,
            Role.PROFESSOR,
        ]);

        const resultado = guard.canActivate(contexto);

        expect(resultado).toBe(true);
    });
});