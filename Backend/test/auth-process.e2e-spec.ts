import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service'; 
import * as bcrypt from 'bcrypt';

describe('AuthModule (Teste de Integração Direta sem Supertest)', () => {
  let authService: AuthService;
  let moduleFixture: TestingModule;
  
  //Cria um objeto falso para fingir ser a base de dados
  const prismaMock = {
    utilizador: {
      findUnique: jest.fn(),
    },
  };

  let passwordHasheada: string;

  beforeAll(async () => {
    // Gera uma hash real para o teste de login funcionar
    passwordHasheada = await bcrypt.hash('123456', 10);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule], // Carrega a app toda (JWT, Mail, Config, etc.)
    })
      // Diz ao NestJS para NÃO usar o Prisma real, mas sim o falso!
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    // Em vez de criar um servidor HTTP (app.init()), vai buscar o serviço de autenticação diretamente à memória da App!
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(() => {
    // Limpa o histórico do Prisma falso antes de cada teste
    jest.clearAllMocks();
  });

  describe('Função: login()', () => {
    it('deve fazer login com sucesso e devolver um JWT Token (Caminho Feliz)', async () => {
      
      // Prepara a "resposta" da base de dados falsa
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Utilizador: 'aluno_teste',
        Password: passwordHasheada, // A password válida
        Ativo: true,
        Pessoa: {
          Nome: 'Simao PDS',
          Professor: { ID_Pessoa: 10 } // Simula que é um professor
        }
      });

      // Executa o serviço diretamente usando código puro
      const resultado = await authService.login({
        username: 'aluno_teste',
        password: '123456',
      });

      // Valida os resultados
      expect(resultado).toHaveProperty('access_token');
      expect(resultado.role).toEqual('Professor');
    });

    it('deve devolver erro (UnauthorizedException) se a password estiver errada', async () => {
      
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Utilizador: 'aluno_teste',
        Password: passwordHasheada,
        Ativo: true,
        Pessoa: { Nome: 'Simao PDS', Professor: { ID_Pessoa: 10 } }
      });

      // Como não existe um pedido HTTP, o erro não vem como "status 401", 
      // mas sim como uma verdadeira exceção no código.
      await expect(
        authService.login({
          username: 'aluno_teste',
          password: 'password_errada_1234', // Erra a password de propósito
        })
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        authService.login({
          username: 'aluno_teste',
          password: 'password_errada_1234',
        })
      ).rejects.toThrow('Os dados introduzidos estão inválidos.');
    });

    it('deve devolver erro (UnauthorizedException) se o utilizador não existir na Base de Dados', async () => {
      
      // Simula que a BD procurou e não encontrou nada
      prismaMock.utilizador.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          username: 'fantasma',
          password: '123456',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});