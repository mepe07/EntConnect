import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../src/auth/auth.service';
import { Role } from '../src/auth/enums/roles.enum';
import { MailService } from '../src/mail/mail.service';
import { MarketplaceService } from '../src/marketplace/marketplace.service';
import { OrigemRegisto } from '../src/marketplace/enums/origem-registo.enum';
import { EstadoAnuncio } from '../src/marketplace/enums/estado-anuncio.enum';
import { TipoAnuncio } from '../src/marketplace/enums/tipo-anuncio.enum';
import { BlobsService } from '../src/Infraestrutura/Blobs/blobs.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jornada Coordenadora Marketplace', () => {
  let authService: AuthService;
  let marketplaceService: MarketplaceService;
  let prismaService: PrismaService;
  let moduleFixture: TestingModule;

  const mockPrismaService = {
    utilizador: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    artigo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stock_Armazem: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockBlobsService = {
    guardarFotosMarketplace: jest.fn(),
  };

  const criarStockFake = (override: Record<string, unknown> = {}) =>
    ({
      ID_Stock: 700,
      ID_Artigo: 500,
      Quantidade_Total: 8,
      Quantidade_Venda: 0,
      Quantidade_Aluguer: 0,
      ID_Cor: null,
      ID_Estado: null,
      ID_Tamanho: null,
      ...override,
    }) as any;

  const criarArtigoInventarioFake = (override: Record<string, unknown> = {}) =>
    ({
      ID_Artigo: 500,
      Nome: 'Vestido de treino',
      Descricao: 'Inventario inicial da escola',
      Foto: null,
      Notas: null,
      Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
      Publicado_No_Marketplace: false,
      Estado_Anuncio: EstadoAnuncio.ATIVO,
      Tipo_Anuncio: null,
      ID_Utilizador_Criador: 1,
      ID_Utilizador_Moderador: null,
      Motivo_Moderacao: null,
      Data_Moderacao: null,
      Stock_Armazem: [criarStockFake()],
      ...override,
    }) as any;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      providers: [
        AuthService,
        MarketplaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: BlobsService, useValue: mockBlobsService },
      ],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
    marketplaceService =
      moduleFixture.get<MarketplaceService>(MarketplaceService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('jwt-coordenadora');
    mockPrismaService.$transaction.mockImplementation(async (callback) =>
      callback(mockPrismaService),
    );
  });

  it('deve simular o fluxo: login coordenadora -> criar artigo inventario -> anunciar no marketplace', async () => {
    // ====================================================================
    // PASSO 1: Coordenadora faz login
    // ====================================================================
    const passwordHasheada = await bcrypt.hash('123456', 10);

    mockPrismaService.utilizador.findUnique.mockResolvedValue({
      ID_Utilizador: 1,
      ID_Pessoa: 10,
      Utilizador: 'coordenadora',
      Password: passwordHasheada,
      Ativo: true,
      Acoes_Rapidas: null,
      Pessoa: {
        Nome: 'Coordenadora EntConnect',
        Professor: null,
        Coordenador: { ID_Pessoa: 10 },
        Enc_Educacao: null,
      },
    });

    const loginResult = await authService.login({
      username: 'coordenadora',
      password: '123456',
    });

    expect(loginResult).toEqual({
      access_token: 'jwt-coordenadora',
      role: Role.COORDENADOR,
      roles: [Role.COORDENADOR],
    });
    expect(prismaService.utilizador.findUnique).toHaveBeenCalledWith({
      where: { Utilizador: 'coordenadora' },
      include: expect.any(Object),
    });

    const coordenadoraAutenticada = {
      sub: 1,
      username: 'coordenadora',
      role: loginResult.role,
      roles: loginResult.roles,
    } as any;

    // ====================================================================
    // PASSO 2: Coordenadora cria um artigo no inventario da escola
    // ====================================================================
    const artigoCriado = criarArtigoInventarioFake();

    mockPrismaService.artigo.create.mockResolvedValue(artigoCriado);
    mockPrismaService.stock_Armazem.create.mockResolvedValue(
      criarStockFake({ ID_Artigo: artigoCriado.ID_Artigo }),
    );

    const resultadoInventario = await marketplaceService.criarItemInventario(
      {
        titulo: 'Vestido de treino',
        descricao: 'Inventario inicial da escola',
        quantidade: 8,
      } as any,
      coordenadoraAutenticada,
    );

    expect(resultadoInventario).toEqual(artigoCriado);
    expect(prismaService.artigo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Nome: 'Vestido de treino',
        Descricao: 'Inventario inicial da escola',
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Publicado_No_Marketplace: false,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        ID_Utilizador_Criador: coordenadoraAutenticada.sub,
      }),
    });
    expect(prismaService.stock_Armazem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ID_Artigo: artigoCriado.ID_Artigo,
        Quantidade_Total: 8,
        Quantidade_Venda: 0,
        Quantidade_Aluguer: 0,
      }),
    });

    // ====================================================================
    // PASSO 3: Coordenadora anuncia esse artigo no marketplace
    // ====================================================================
    const artigoPublicado = criarArtigoInventarioFake({
      Publicado_No_Marketplace: true,
      Tipo_Anuncio: TipoAnuncio.VENDA,
      Stock_Armazem: [
        criarStockFake({
          Quantidade_Venda: 3,
          Quantidade_Aluguer: 0,
        }),
      ],
    });

    mockPrismaService.artigo.findUnique.mockResolvedValue(artigoCriado);
    mockPrismaService.stock_Armazem.update.mockResolvedValue(
      criarStockFake({ Quantidade_Venda: 3 }),
    );
    mockPrismaService.artigo.update.mockResolvedValue(artigoPublicado);

    const resultadoMarketplace =
      await marketplaceService.publicarInventarioDaEscola(
        {
          idArtigo: artigoCriado.ID_Artigo,
          tipoAnuncio: TipoAnuncio.VENDA,
          quantidadeDisponivel: 3,
          titulo: 'Vestido de treino para venda',
          descricao: 'Disponivel para venda no marketplace',
        } as any,
        coordenadoraAutenticada,
      );

    expect(resultadoMarketplace).toEqual(artigoPublicado);
    expect(prismaService.artigo.findUnique).toHaveBeenCalledWith({
      where: { ID_Artigo: artigoCriado.ID_Artigo },
      include: expect.any(Object),
    });
    expect(prismaService.stock_Armazem.update).toHaveBeenCalledWith({
      where: { ID_Stock: 700 },
      data: {
        Quantidade_Venda: 3,
        Quantidade_Aluguer: 0,
      },
    });
    expect(prismaService.artigo.update).toHaveBeenCalledWith({
      where: { ID_Artigo: artigoCriado.ID_Artigo },
      data: expect.objectContaining({
        Nome: 'Vestido de treino para venda',
        Descricao: 'Disponivel para venda no marketplace',
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Tipo_Anuncio: TipoAnuncio.VENDA,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        Publicado_No_Marketplace: true,
      }),
      include: expect.any(Object),
    });
  });
});
