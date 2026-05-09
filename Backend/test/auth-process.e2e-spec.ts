import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service'; 
import * as bcrypt from 'bcrypt';

describe('AuthModule (Teste de Integração Direta sem Supertest)', () => {
  let authService: AuthService;
  let moduleFixture: TestingModule;
  
  //Configura um mock global para simular o comportamento da base de dados Prisma
  const prismaMock = {
    utilizador: {
      findUnique: jest.fn(),
    },
  };

  let passwordHasheada: string;

  beforeAll(async () => {
    //Gera uma hash real para garantir o funcionamento do teste de verificação de login
    passwordHasheada = await bcrypt.hash('123456', 10);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule], //Carrega o módulo principal com todas as suas dependências (JWT, Mail, Config, etc.)
    })
      //Substitui o PrismaService real pelo mock criado anteriormente
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    //Obtém a instância do serviço de autenticação diretamente do contentor de injeção de dependências, sem inicializar o servidor HTTP
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    //Encerra o módulo de testes para libertar recursos
    await moduleFixture.close();
  });

  beforeEach(() => {
    //Limpa o histórico de chamadas do mock do Prisma antes de cada teste
    jest.clearAllMocks();
  });

  describe('Função: login()', () => {
    it('deve fazer login com sucesso e devolver um JWT Token (Caminho Feliz)', async () => {
      
      //Prepara o cenário simulando a devolução de um utilizador válido pela base de dados
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Utilizador: 'aluno_teste',
        Password: passwordHasheada, //Fornece a password corretamente hasheada
        Ativo: true,
        Pessoa: {
          Nome: 'Simao PDS',
          Professor: { ID_Pessoa: 10 } //Simula a associação a um perfil de professor
        }
      });

      //Executa o método de login do serviço diretamente com as credenciais corretas
      const resultado = await authService.login({
        username: 'aluno_teste',
        password: '123456',
      });

      //Valida se a resposta contém o token de acesso e se o papel (role) foi corretamente atribuído
      expect(resultado).toHaveProperty('access_token');
      expect(resultado.role).toEqual('Professor');
    });

    it('deve devolver erro (UnauthorizedException) se a password estiver errada', async () => {
      
      //Simula a existência do utilizador na base de dados
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Utilizador: 'aluno_teste',
        Password: passwordHasheada,
        Ativo: true,
        Pessoa: { Nome: 'Simao PDS', Professor: { ID_Pessoa: 10 } }
      });

      //Valida que o serviço lança a exceção diretamente no código, uma vez que não há um controlador HTTP a converter o erro num status 401
      await expect(
        authService.login({
          username: 'aluno_teste',
          password: 'password_errada_1234', //Envia uma password propositadamente incorreta
        })
      ).rejects.toThrow(UnauthorizedException);
      
      //Valida se a mensagem da exceção corresponde ao esperado
      await expect(
        authService.login({
          username: 'aluno_teste',
          password: 'password_errada_1234',
        })
      ).rejects.toThrow('Os dados introduzidos estão inválidos.');
    });

    it('deve devolver erro (UnauthorizedException) se o utilizador não existir na Base de Dados', async () => {
      
      //Simula o cenário em que a pesquisa na base de dados não retorna resultados
      prismaMock.utilizador.findUnique.mockResolvedValue(null);

      //Tenta fazer login com um utilizador inexistente e valida a rejeição com erro de autorização
      await expect(
        authService.login({
          username: 'fantasma',
          password: '123456',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});