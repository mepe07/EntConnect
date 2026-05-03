// Ficheiro: src/auth/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './enums/roles.enum';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

// Substitui a implementação real do bcrypt por um mock controlado pelo teste.
// Assim conseguimos simular passwords válidas ou inválidas sem usar hashes reais.
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;

    // Mock do PrismaService usado pelo AuthService para procurar utilizadores.
    // Evita dependência da base de dados real durante os testes unitários.
    const prismaMock = {
        utilizador: {
            findUnique: jest.fn(),
        },
    };

    // Mock do JwtService usado para simular a geração do token JWT.
    const jwtServiceMock = {
        signAsync: jest.fn(),
    };

    const mailServiceMock = {
        sendPasswordResetEmail: jest.fn(),
    };

    beforeEach(async () => {
        // Cria um módulo de teste do NestJS com o AuthService real,
        // mas substitui as dependências externas por mocks.
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

        // Garante que cada teste começa com os mocks limpos,
        // sem histórico de chamadas ou valores do teste anterior.
        jest.clearAllMocks();
    });

    // Helper para criar um DTO de login válido.
    const criarLoginDto = (): LoginDto => ({
        username: 'simas',
        password: '123456',
    });

    // Helper para criar um utilizador base reutilizável nos testes.
    // O parâmetro "override" permite adaptar apenas os campos necessários
    // para cada cenário específico.
    const criarUtilizadorFake = (override = {}) => ({
        ID_Utilizador: 1,
        Utilizador: 'simas',
        Password: 'hash-da-password',
        Ativo: true,
        ID_Pessoa: 10,
        Pessoa: {
            Nome: 'Simao Silva',
            Professor: null,
            Coordenador: { ID_Pessoa: 10 },
            Direcao: null,
            Enc_Educacao: null,
        },
        ...override,
    });

    it('deve fazer login com sucesso quando as credenciais são válidas e o utilizador está ativo', async () => {
        const loginDto = criarLoginDto();
        const utilizador = criarUtilizadorFake();

        // Simula:
        // - utilizador encontrado na BD
        // - password correta
        // - token gerado com sucesso
        prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

        const resultado = await service.login(loginDto);

        // Valida que o serviço procurou o utilizador com o include esperado.
        expect(prismaMock.utilizador.findUnique).toHaveBeenCalledWith({
            where: { Utilizador: loginDto.username },
            include: {
                Pessoa: {
                    include: {
                        Professor: true,
                        Coordenador: true,
                        Direcao: true,
                        Enc_Educacao: true,
                    },
                },
            },
        });

        // Valida que a password foi comparada e que o token foi gerado.
        expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, utilizador.Password);
        expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
            sub: utilizador.ID_Utilizador,
            username: utilizador.Utilizador,
            nome: utilizador.Pessoa.Nome,
            role: Role.COORDENADOR,
            idPessoa: utilizador.ID_Pessoa,
        });

        // Valida o resultado final devolvido pelo login.
        expect(resultado).toEqual({
            access_token: 'fake-jwt-token',
            role: Role.COORDENADOR,
        });
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
            new UnauthorizedException('A sua conta está inativa. Contacte a coordenação.'),
        );
    });

    it('deve devolver a role PROFESSOR quando o utilizador tem perfil de professor', async () => {
        const loginDto = criarLoginDto();
        const utilizador = criarUtilizadorFake({
            Pessoa: {
                Professor: { ID_Pessoa: 10 },
                Coordenador: null,
                Direcao: null,
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
                Direcao: null,
                Enc_Educacao: { ID_Pessoa: 10 },
            },
        });

        prismaMock.utilizador.findUnique.mockResolvedValue(utilizador);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

        const resultado = await service.login(loginDto);

        expect(resultado.role).toBe(Role.ENC_EDUCACAO);
    });
});
