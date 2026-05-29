import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcaoModeracao } from './enums/acao-moderacao.enum';
import { EstadoAnuncio } from './enums/estado-anuncio.enum';
import { OrigemRegisto } from './enums/origem-registo.enum';
import { TipoAnuncio } from './enums/tipo-anuncio.enum';
import { TipoInteresse } from './enums/tipo-interesse.enum';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let prismaService: PrismaService;
  let blobsService: BlobsService;

  const prismaMock = {
    artigo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stock_Armazem: {
      create: jest.fn(),
      update: jest.fn(),
    },
    interesse_Artigo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    aluguer_Artigo: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    registo_Moderacao_Marketplace: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const blobsMock = {
    guardarFotosMarketplace: jest.fn(),
  };

  const utilizador = {
    sub: 10,
    username: 'ana',
    role: 'Professor',
  } as any;

  const coordenador = {
    sub: 20,
    username: 'coord',
    role: 'Coordenador',
  } as any;

  const outroUtilizador = {
    sub: 30,
    username: 'rui',
    role: 'EncEducacao',
  } as any;

  const criarStock = (overrides = {}) =>
    ({
      ID_Stock: 5,
      ID_Artigo: 1,
      Quantidade_Total: 4,
      Quantidade_Venda: 2,
      Quantidade_Aluguer: 0,
      ID_Cor: null,
      ID_Estado: null,
      ID_Tamanho: null,
      ...overrides,
    }) as any;

  const criarArtigo = (overrides = {}) =>
    ({
      ID_Artigo: 1,
      Nome: 'Sapatilhas',
      Descricao: 'Descricao',
      Notas: null,
      Foto: 'foto.jpg',
      Tipo_Anuncio: TipoAnuncio.VENDA,
      Aluguer_Continuo: false,
      Origem_Registo: OrigemRegisto.UTILIZADOR,
      Publicado_No_Marketplace: true,
      Estado_Anuncio: EstadoAnuncio.ATIVO,
      ID_Utilizador_Criador: utilizador.sub,
      ID_Utilizador_Moderador: null,
      Motivo_Moderacao: null,
      Data_Moderacao: null,
      Stock_Armazem: [criarStock()],
      ...overrides,
    }) as any;

  const criarPedidoAluguer = (overrides = {}) =>
    ({
      ID_Interesse: 100,
      ID_Utilizador: coordenador.sub,
      ID_Stock: 5,
      Mensagem: 'Pedido',
      Estado: 'Pendente',
      Tipo: TipoInteresse.ALUGUER,
      Data_Registo: new Date('2030-06-01T10:00:00.000Z'),
      Data_Inicio_Pretendida: new Date('2030-06-10T00:00:00.000Z'),
      Data_Fim_Pretendida: new Date('2030-06-15T00:00:00.000Z'),
      Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
      Stock_Armazem: criarStock({
        Quantidade_Total: 1,
        Quantidade_Venda: 0,
        Quantidade_Aluguer: 1,
        Artigo: criarArtigo({
          ID_Utilizador_Criador: utilizador.sub,
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [],
        }),
      }),
      Utilizador: {},
      ...overrides,
    }) as any;

  const criarAluguer = (overrides = {}) =>
    ({
      ID_Aluguer: 90,
      ID_Stock: 5,
      ID_Utilizador: coordenador.sub,
      Data_Entrega: new Date('2030-06-10T00:00:00.000Z'),
      Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
      Data_Recolha_Efetiva: null,
      Estado: 'Ativo',
      Stock_Armazem: criarStock({
        Quantidade_Total: 1,
        Quantidade_Venda: 0,
        Quantidade_Aluguer: 1,
        Artigo: criarArtigo({
          ID_Utilizador_Criador: utilizador.sub,
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [],
        }),
      }),
      Utilizador: {},
      ...overrides,
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BlobsService, useValue: blobsMock },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    prismaService = module.get<PrismaService>(PrismaService);
    blobsService = module.get<BlobsService>(BlobsService);

    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );
  });

  describe('listarAnuncios', () => {
    it('deve listar anuncios ativos e publicados por defeito', async () => {
      const artigos = [criarArtigo()];
      prismaMock.artigo.findMany.mockResolvedValue(artigos);

      await expect(service.listarAnuncios({})).resolves.toEqual(artigos);

      expect(prismaService.artigo.findMany).toHaveBeenCalledWith({
        where: {
          Publicado_No_Marketplace: true,
          Estado_Anuncio: { in: [EstadoAnuncio.ATIVO] },
        },
        include: expect.any(Object),
        orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
      });
    });

    it('deve aplicar filtros de pesquisa, tipo, origem e criador', async () => {
      prismaMock.artigo.findMany.mockResolvedValue([]);

      await service.listarAnuncios({
        pesquisa: '  sapatilhas ',
        tipoAnuncio: TipoAnuncio.ALUGUER,
        origem: OrigemRegisto.INVENTARIO_ESCOLA,
        idCriador: 10,
        publicado: false,
        estado: EstadoAnuncio.REMOVIDO,
      } as any);

      expect(prismaService.artigo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            Publicado_No_Marketplace: false,
            Estado_Anuncio: EstadoAnuncio.REMOVIDO,
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
            ID_Utilizador_Criador: 10,
            OR: [
              { Nome: { contains: 'sapatilhas' } },
              { Descricao: { contains: 'sapatilhas' } },
              { Notas: { contains: 'sapatilhas' } },
            ],
          }),
        }),
      );
    });
  });

  describe('obterAnuncio', () => {
    it('deve devolver o anuncio quando existe', async () => {
      const artigo = criarArtigo();
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);

      await expect(service.obterAnuncio(1)).resolves.toEqual(artigo);
      expect(prismaService.artigo.findUnique).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        include: expect.any(Object),
      });
    });

    it('deve lancar erro quando o anuncio nao existe', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(null);

      await expect(service.obterAnuncio(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('obterCalendarioAnuncio', () => {
    it('deve devolver calendário público para utilizador que não é dono', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          ID_Utilizador_Criador: utilizador.sub,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          ID_Aluguer: 1,
          Estado: 'Reservado',
          Data_Entrega: new Date('2030-06-11T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-18T00:00:00.000Z'),
        }),
      ]);

      await expect(
        service.obterCalendarioAnuncio(1, outroUtilizador),
      ).resolves.toEqual([
        {
          dataInicio: '2030-06-11',
          dataFim: '2030-06-18',
          estado: 'ocupado',
        },
      ]);

      expect(prismaService.aluguer_Artigo.findMany).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
        },
        include: expect.objectContaining({
          Utilizador: { include: { Pessoa: true } },
        }),
        orderBy: [{ Data_Entrega: 'asc' }, { ID_Aluguer: 'asc' }],
      });
    });

    it('deve devolver calendário detalhado para o dono', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          ID_Aluguer: 2,
          Estado: 'Ativo',
          Data_Entrega: new Date('2030-06-11T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-18T00:00:00.000Z'),
          Utilizador: {
            Pessoa: {
              Nome: 'Miguel Ferreira',
              Email: 'miguel.ferreira@escola.pt',
              Contacto: '912345678',
            },
          },
        }),
        criarAluguer({
          ID_Aluguer: 3,
          Estado: 'Devolucao_Pendente',
          Data_Entrega: new Date('2030-06-24T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-26T00:00:00.000Z'),
          Utilizador: {
            Pessoa: {
              Nome: 'Beatriz Santos',
              Email: null,
              Contacto: 'beatriz-contacto',
            },
          },
        }),
      ]);

      await expect(service.obterCalendarioAnuncio(1, utilizador)).resolves.toEqual([
        {
          idAluguer: 2,
          dataInicio: '2030-06-11',
          dataFim: '2030-06-18',
          estado: 'alugado',
          nomePessoa: 'Miguel Ferreira',
          contacto: 'miguel.ferreira@escola.pt',
        },
        {
          idAluguer: 3,
          dataInicio: '2030-06-24',
          dataFim: '2030-06-26',
          estado: 'devolucao_pendente',
          nomePessoa: 'Beatriz Santos',
          contacto: 'beatriz-contacto',
        },
      ]);

      expect(prismaService.aluguer_Artigo.findMany).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
        },
        include: expect.objectContaining({
          Utilizador: { include: { Pessoa: true } },
        }),
        orderBy: [{ Data_Entrega: 'asc' }, { ID_Aluguer: 'asc' }],
      });
    });

    it('deve tratar coordenador que não é dono como resposta pública', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          ID_Utilizador_Criador: utilizador.sub,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          ID_Aluguer: 4,
          Estado: 'Ativo',
          Utilizador: {
            Pessoa: {
              Nome: 'Nome Privado',
              Email: 'privado@escola.pt',
            },
          },
        }),
      ]);

      await expect(
        service.obterCalendarioAnuncio(1, coordenador),
      ).resolves.toEqual([
        {
          dataInicio: '2030-06-10',
          dataFim: '2030-06-15',
          estado: 'ocupado',
        },
      ]);
    });

    it('deve rejeitar calendário para anúncio de venda', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());

      await expect(
        service.obterCalendarioAnuncio(1, utilizador),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.aluguer_Artigo.findMany).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando o anúncio não existe', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(null);

      await expect(
        service.obterCalendarioAnuncio(999, utilizador),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve pedir apenas estados bloqueantes e ignorar concluídos ou cancelados', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({ Estado: 'Reservado' }),
        criarAluguer({ ID_Aluguer: 6, Estado: 'Ativo' }),
        criarAluguer({ ID_Aluguer: 7, Estado: 'Devolucao_Pendente' }),
      ]);

      const resultado = await service.obterCalendarioAnuncio(1, utilizador);

      expect(resultado).toHaveLength(3);
      expect(prismaService.aluguer_Artigo.findMany).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
        },
        include: expect.objectContaining({
          Utilizador: { include: { Pessoa: true } },
        }),
        orderBy: [{ Data_Entrega: 'asc' }, { ID_Aluguer: 'asc' }],
      });
    });
  });

  describe('listarMeusAlugueres', () => {
    it('deve listar alugueres em que o utilizador é interessado', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          ID_Utilizador: utilizador.sub,
          Estado: 'Ativo',
          Utilizador: {
            Pessoa: {
              Nome: 'Ana',
              Email: 'ana@escola.pt',
            },
          },
          Stock_Armazem: criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
            Artigo: criarArtigo({
              ID_Utilizador_Criador: outroUtilizador.sub,
              Tipo_Anuncio: TipoAnuncio.ALUGUER,
              Aluguer_Continuo: true,
              Foto: 'camisa.jpg',
              Stock_Armazem: [],
              Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador: {
                Pessoa: {
                  Nome: 'Rui Dono',
                },
              },
            }),
          }),
        }),
      ]);

      await expect(service.listarMeusAlugueres(utilizador)).resolves.toEqual([
        expect.objectContaining({
          tipoRegisto: 'aluguer',
          idAluguer: 90,
          idPedido: null,
          idAnuncio: 1,
          artigo: 'Sapatilhas',
          foto: 'camisa.jpg',
          estado: 'ativo',
          papel: 'interessado',
          outraPessoa: 'Rui Dono',
          contactoOutraPessoa: null,
          aluguerContinuo: true,
          podeMarcarComoDevolvido: true,
          podeConfirmarDevolucao: false,
        }),
      ]);
    });

    it('deve listar alugueres em que o utilizador é dono', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          Estado: 'Devolucao_Pendente',
          Utilizador: {
            Pessoa: {
              Nome: 'Miguel Ferreira',
              Email: 'miguel.ferreira@escola.pt',
              Contacto: '912345678',
            },
          },
        }),
      ]);

      await expect(service.listarMeusAlugueres(utilizador)).resolves.toEqual([
        expect.objectContaining({
          tipoRegisto: 'aluguer',
          papel: 'dono',
          estado: 'devolucao_pendente',
          outraPessoa: 'Miguel Ferreira',
          contactoOutraPessoa: 'miguel.ferreira@escola.pt',
          podeConfirmarDevolucao: true,
        }),
      ]);
    });

    it('deve listar pedidos pendentes feitos pelo utilizador', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([
        criarPedidoAluguer({
          ID_Utilizador: utilizador.sub,
          Utilizador: {
            Pessoa: {
              Nome: 'Ana',
              Email: 'ana@escola.pt',
            },
          },
          Stock_Armazem: criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
            Artigo: criarArtigo({
              ID_Utilizador_Criador: outroUtilizador.sub,
              Tipo_Anuncio: TipoAnuncio.ALUGUER,
              Stock_Armazem: [],
              Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador: {
                Pessoa: {
                  Nome: 'Dona Rita',
                },
              },
            }),
          }),
        }),
      ]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([]);

      await expect(service.listarMeusAlugueres(utilizador)).resolves.toEqual([
        expect.objectContaining({
          tipoRegisto: 'pedido',
          papel: 'interessado',
          estado: 'pendente',
          podeAceitar: false,
          podeRejeitar: false,
          podeCancelar: false,
          outraPessoa: 'Dona Rita',
        }),
      ]);
    });

    it('deve listar pedidos pendentes recebidos em artigos do utilizador', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([
        criarPedidoAluguer({
          Utilizador: {
            Pessoa: {
              Nome: 'Rita Almeida',
              Email: 'rita.almeida@escola.pt',
            },
          },
        }),
      ]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([]);

      await expect(service.listarMeusAlugueres(utilizador)).resolves.toEqual([
        expect.objectContaining({
          tipoRegisto: 'pedido',
          papel: 'dono',
          estado: 'pendente',
          outraPessoa: 'Rita Almeida',
          contactoOutraPessoa: 'rita.almeida@escola.pt',
          podeAceitar: true,
          podeRejeitar: true,
        }),
      ]);
    });

    it('não duplica pedido aceite quando já existe aluguer', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([criarAluguer()]);

      const resultado = await service.listarMeusAlugueres(utilizador);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          tipoRegisto: 'aluguer',
          idPedido: null,
        }),
      );
    });

    it('trata coordenador apenas com os seus próprios registos', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([
        criarPedidoAluguer({
          ID_Utilizador: coordenador.sub,
          Stock_Armazem: criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
            Artigo: criarArtigo({
              ID_Utilizador_Criador: utilizador.sub,
              Tipo_Anuncio: TipoAnuncio.ALUGUER,
              Stock_Armazem: [],
              Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador: {
                Pessoa: { Nome: 'Ana Dona' },
              },
            }),
          }),
        }),
      ]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([]);

      const resultado = await service.listarMeusAlugueres(coordenador);

      expect(resultado).toHaveLength(1);
      expect(prismaService.interesse_Artigo.findMany).toHaveBeenCalledWith({
        where: {
          Tipo: TipoInteresse.ALUGUER,
          Estado: { in: ['Pendente', 'Rejeitado', 'Cancelado'] },
          OR: [
            { ID_Utilizador: coordenador.sub },
            {
              Stock_Armazem: {
                Artigo: {
                  ID_Utilizador_Criador: coordenador.sub,
                },
              },
            },
          ],
        },
        include: expect.any(Object),
        orderBy: [{ Data_Registo: 'desc' }, { ID_Interesse: 'desc' }],
      });
      expect(prismaService.aluguer_Artigo.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ID_Utilizador: coordenador.sub },
            {
              Stock_Armazem: {
                Artigo: {
                  ID_Utilizador_Criador: coordenador.sub,
                },
              },
            },
          ],
        },
        include: expect.any(Object),
        orderBy: [{ Data_Entrega: 'desc' }, { ID_Aluguer: 'desc' }],
      });
    });

    it('ordena resultados de forma previsível', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([
        criarPedidoAluguer({
          ID_Interesse: 101,
          Data_Inicio_Pretendida: new Date('2030-06-25T00:00:00.000Z'),
          Data_Fim_Pretendida: new Date('2030-06-26T00:00:00.000Z'),
        }),
      ]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([
        criarAluguer({
          ID_Aluguer: 201,
          Estado: 'Concluido',
          Data_Entrega: new Date('2030-06-20T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-22T00:00:00.000Z'),
        }),
        criarAluguer({
          ID_Aluguer: 202,
          Estado: 'Ativo',
          Data_Entrega: new Date('2030-06-10T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
        }),
      ]);

      const resultado = await service.listarMeusAlugueres(utilizador);

      expect(resultado.map((item) => item.estado)).toEqual([
        'pendente',
        'ativo',
        'concluido',
      ]);
    });

    it('não inclui registos sem relação com o utilizador autenticado', async () => {
      prismaMock.interesse_Artigo.findMany.mockResolvedValue([]);
      prismaMock.aluguer_Artigo.findMany.mockResolvedValue([]);

      await expect(service.listarMeusAlugueres(utilizador)).resolves.toEqual([]);
    });
  });

  describe('criarAnuncio', () => {
    it('deve criar anuncio e stock numa transacao', async () => {
      const dto = {
        titulo: 'Fato',
        descricao: 'Fato de danca',
        tipoAnuncio: TipoAnuncio.VENDA,
        quantidadeTotal: 3,
        quantidadeDisponivel: 2,
        idTamanho: 1,
        aluguerContinuo: true,
      } as any;
      const artigoCriado = criarArtigo({ ID_Artigo: 30, Nome: dto.titulo });
      prismaMock.artigo.create.mockResolvedValue(artigoCriado);

      await expect(service.criarAnuncio(dto, utilizador)).resolves.toEqual(
        artigoCriado,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          Nome: 'Fato',
          Tipo_Anuncio: TipoAnuncio.VENDA,
          Aluguer_Continuo: false,
          Origem_Registo: OrigemRegisto.UTILIZADOR,
          Publicado_No_Marketplace: true,
          Estado_Anuncio: EstadoAnuncio.ATIVO,
          ID_Utilizador_Criador: utilizador.sub,
        }),
      });
      expect(prismaService.stock_Armazem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Artigo: 30,
          Quantidade_Total: 3,
          Quantidade_Venda: 3,
          Quantidade_Aluguer: 0,
          ID_Tamanho: 1,
        }),
      });
    });

    it('deve guardar foto quando recebe ficheiro', async () => {
      const dto = {
        titulo: 'Casaco',
        tipoAnuncio: TipoAnuncio.ALUGUER,
        quantidadeTotal: 1,
        quantidadeDisponivel: 1,
        aluguerContinuo: true,
      } as any;
      const file = {
        originalname: 'foto.png',
        mimetype: 'image/png',
        size: 1000,
        buffer: Buffer.from('foto'),
      } as Express.Multer.File;

      blobsMock.guardarFotosMarketplace.mockResolvedValue('https://foto');
      prismaMock.artigo.create.mockResolvedValue(criarArtigo());

      await service.criarAnuncio(dto, utilizador, file);

      expect(blobsService.guardarFotosMarketplace).toHaveBeenCalledWith(
        'marketplace',
        expect.stringMatching(/^anuncio_10_/),
        file,
      );
      expect(prismaService.artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          Foto: 'https://foto',
          Aluguer_Continuo: true,
        }),
      });
    });

    it('deve rejeitar criacao de anuncio com tipo legado ambos', async () => {
      await expect(
        service.criarAnuncio(
          {
            titulo: 'Legacy',
            tipoAnuncio: TipoAnuncio.AMBOS,
            quantidadeTotal: 1,
          } as any,
          utilizador,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('atualizarAnuncio', () => {
    it('deve atualizar anuncio do dono e respetivo stock', async () => {
      const artigo = criarArtigo();
      const artigoAtualizado = criarArtigo({ Nome: 'Novo titulo' });
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.artigo.update.mockResolvedValue(artigoAtualizado);

      await expect(
        service.atualizarAnuncio(
          1,
          {
            titulo: 'Novo titulo',
            quantidadeTotal: 5,
            quantidadeDisponivel: 5,
            aluguerContinuo: true,
          } as any,
          utilizador,
        ),
      ).resolves.toEqual(artigoAtualizado);

      expect(prismaService.stock_Armazem.update).toHaveBeenCalledWith({
        where: { ID_Stock: 5 },
        data: expect.objectContaining({
          Quantidade_Total: 5,
          Quantidade_Venda: 5,
          Quantidade_Aluguer: 0,
        }),
      });
      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Nome: 'Novo titulo',
          Tipo_Anuncio: TipoAnuncio.VENDA,
          Aluguer_Continuo: false,
        }),
        include: expect.any(Object),
      });
    });

    it('deve rejeitar atualizacao por utilizador sem permissao', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({ ID_Utilizador_Criador: 99 }),
      );

      await expect(
        service.atualizarAnuncio(1, { titulo: 'X' } as any, utilizador),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaService.artigo.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar atualizacao sem stock associado', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({ Stock_Armazem: [] }),
      );

      await expect(
        service.atualizarAnuncio(1, { titulo: 'X' } as any, utilizador),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve permitir aluguer contínuo apenas em anúncios de aluguer', async () => {
      const artigo = criarArtigo({ Tipo_Anuncio: TipoAnuncio.ALUGUER });
      const artigoAtualizado = criarArtigo({
        Tipo_Anuncio: TipoAnuncio.ALUGUER,
        Aluguer_Continuo: true,
      });
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.artigo.update.mockResolvedValue(artigoAtualizado);

      await expect(
        service.atualizarAnuncio(
          1,
          {
            tipoAnuncio: TipoAnuncio.ALUGUER,
            quantidadeDisponivel: 4,
            aluguerContinuo: true,
          } as any,
          utilizador,
        ),
      ).resolves.toEqual(artigoAtualizado);

      expect(prismaService.artigo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Aluguer_Continuo: true,
          }),
        }),
      );
    });
  });

  describe('publicarInventarioDaEscola', () => {
    it('deve publicar inventario da coordenadora', async () => {
      const artigo = criarArtigo({
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Publicado_No_Marketplace: false,
        ID_Utilizador_Criador: coordenador.sub,
      });
      const artigoPublicado = criarArtigo({
        ID_Utilizador_Criador: coordenador.sub,
        Publicado_No_Marketplace: true,
      });
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.artigo.update.mockResolvedValue(artigoPublicado);

      await expect(
        service.publicarInventarioDaEscola(
          {
            idArtigo: 1,
            titulo: 'Publicado',
            tipoAnuncio: TipoAnuncio.ALUGUER,
            quantidadeDisponivel: 2,
            aluguerContinuo: true,
          } as any,
          coordenador,
        ),
      ).resolves.toEqual(artigoPublicado);

      expect(prismaService.stock_Armazem.update).toHaveBeenCalledWith({
        where: { ID_Stock: 5 },
        data: { Quantidade_Venda: 0, Quantidade_Aluguer: 2 },
      });
      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Nome: 'Publicado',
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Aluguer_Continuo: true,
          Publicado_No_Marketplace: true,
        }),
        include: expect.any(Object),
      });
    });

    it('deve rejeitar publicacao sem role de coordenador', async () => {
      await expect(
        service.publicarInventarioDaEscola(
          { idArtigo: 1, tipoAnuncio: TipoAnuncio.VENDA, quantidadeDisponivel: 1 } as any,
          utilizador,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaService.artigo.findUnique).not.toHaveBeenCalled();
    });

    it('deve rejeitar publicacao de inventario com tipo legado ambos', async () => {
      await expect(
        service.publicarInventarioDaEscola(
          {
            idArtigo: 1,
            tipoAnuncio: TipoAnuncio.AMBOS,
            quantidadeVenda: 1,
            quantidadeAluguer: 1,
          } as any,
          coordenador,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.artigo.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('alterarEstado e removerAnuncio', () => {
    it('deve alterar estado quando o utilizador e dono do anuncio', async () => {
      const artigo = criarArtigo();
      const atualizado = criarArtigo({
        Estado_Anuncio: EstadoAnuncio.RESERVADO,
      });
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.artigo.update.mockResolvedValue(atualizado);

      await expect(
        service.alterarEstado(
          1,
          { estado: EstadoAnuncio.RESERVADO } as any,
          utilizador,
        ),
      ).resolves.toEqual(atualizado);

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.RESERVADO,
          Publicado_No_Marketplace: false,
        }),
        include: expect.any(Object),
      });
    });

    it('deve impedir remocao administrativa por nao moderador', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());

      await expect(
        service.alterarEstado(
          1,
          { estado: EstadoAnuncio.REMOVIDO } as any,
          utilizador,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve remover anuncio quando o utilizador e dono', async () => {
      const removido = criarArtigo({ Estado_Anuncio: EstadoAnuncio.REMOVIDO });
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());
      prismaMock.artigo.update.mockResolvedValue(removido);

      await expect(service.removerAnuncio(1, utilizador)).resolves.toEqual(
        removido,
      );

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.REMOVIDO,
          Publicado_No_Marketplace: false,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('moderarAnuncio', () => {
    it('deve remover anuncio e criar registo de moderacao', async () => {
      const artigo = criarArtigo({ ID_Utilizador_Criador: 99 });
      const artigoModerado = criarArtigo({
        ID_Utilizador_Criador: 99,
        Estado_Anuncio: EstadoAnuncio.REMOVIDO,
      });
      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.artigo.update.mockResolvedValue(artigoModerado);
      prismaMock.registo_Moderacao_Marketplace.create.mockResolvedValue({
        ID_Registo_Moderacao: 1,
      });

      await expect(
        service.moderarAnuncio(
          1,
          { acao: AcaoModeracao.REMOVER, motivo: 'Conteudo invalido' } as any,
          coordenador,
        ),
      ).resolves.toEqual(artigoModerado);

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.REMOVIDO,
          Publicado_No_Marketplace: false,
          ID_Utilizador_Moderador: coordenador.sub,
          Motivo_Moderacao: 'Conteudo invalido',
        }),
        include: expect.any(Object),
      });
      expect(
        prismaService.registo_Moderacao_Marketplace.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Artigo: 1,
          ID_Utilizador_Moderador: coordenador.sub,
          Acao: AcaoModeracao.REMOVER,
          Estado_Anterior: EstadoAnuncio.ATIVO,
          Estado_Novo: EstadoAnuncio.REMOVIDO,
          Motivo: 'Conteudo invalido',
        }),
      });
    });

    it('deve rejeitar moderacao por nao coordenador', async () => {
      await expect(
        service.moderarAnuncio(
          1,
          { acao: AcaoModeracao.REMOVER } as any,
          utilizador,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaService.artigo.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('registarInteresse', () => {
    it('deve registar interesse em anuncio ativo de outro utilizador', async () => {
      const interesse = { ID_Interesse: 100, ID_Utilizador: coordenador.sub };
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({ ID_Utilizador_Criador: 99 }),
      );
      prismaMock.interesse_Artigo.create.mockResolvedValue(interesse);

      await expect(
        service.registarInteresse(
          1,
          {
            mensagem: 'Tenho interesse',
            tipo: TipoInteresse.COMPRA,
            dataRecolhaPrevista: '2030-06-01',
          } as any,
          coordenador,
        ),
      ).resolves.toEqual(interesse);

      expect(prismaService.interesse_Artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Stock: 5,
          ID_Utilizador: coordenador.sub,
          Mensagem: 'Tenho interesse',
          Tipo: TipoInteresse.COMPRA,
          Estado: 'Novo',
          Data_Recolha_Prevista: new Date('2030-06-01'),
        }),
      });
    });

    it('deve rejeitar interesse no proprio anuncio', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());

      await expect(
        service.registarInteresse(
          1,
          { tipo: TipoInteresse.CONTACTO } as any,
          utilizador,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.interesse_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar interesse em anuncio indisponivel', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({ Publicado_No_Marketplace: false }),
      );

      await expect(
        service.registarInteresse(1, {} as any, coordenador),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('fluxo de pedidos e alugueres', () => {
    it('deve criar pedido de aluguer válido com datas', async () => {
      const artigo = criarArtigo({
        ID_Utilizador_Criador: utilizador.sub,
        Tipo_Anuncio: TipoAnuncio.ALUGUER,
        Stock_Armazem: [
          criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
          }),
        ],
      });
      const pedidoCriado = criarPedidoAluguer();

      prismaMock.artigo.findUnique.mockResolvedValue(artigo);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.interesse_Artigo.create.mockResolvedValue(pedidoCriado);

      await expect(
        service.criarPedidoAluguer(
          1,
          {
            dataInicio: '2030-06-10',
            dataFim: '2030-06-15',
            mensagem: 'Preciso deste artigo para um evento.',
          },
          coordenador,
        ),
      ).resolves.toEqual(pedidoCriado);

      expect(prismaService.aluguer_Artigo.findFirst).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
          Data_Entrega: { lt: new Date(2030, 5, 15, 0, 0, 0, 0) },
          Data_Recolha_Prevista: { gt: new Date(2030, 5, 10, 0, 0, 0, 0) },
        },
      });
      expect(prismaService.interesse_Artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Stock: 5,
          ID_Utilizador: coordenador.sub,
          Tipo: TipoInteresse.ALUGUER,
          Estado: 'Pendente',
          Data_Inicio_Pretendida: new Date(2030, 5, 10, 0, 0, 0, 0),
          Data_Fim_Pretendida: new Date(2030, 5, 15, 0, 0, 0, 0),
          Data_Recolha_Prevista: new Date(2030, 5, 15, 0, 0, 0, 0),
        }),
        include: expect.any(Object),
      });
    });

    it('deve rejeitar pedido de aluguer para anuncio de venda', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());

      await expect(
        service.criarPedidoAluguer(
          1,
          { dataInicio: '2030-06-10', dataFim: '2030-06-15' },
          coordenador,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar pedido de aluguer para o proprio anuncio', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );

      await expect(
        service.criarPedidoAluguer(
          1,
          { dataInicio: '2030-06-10', dataFim: '2030-06-15' },
          utilizador,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar pedido de aluguer com datas inválidas', async () => {
      prismaMock.artigo.findUnique.mockResolvedValue(
        criarArtigo({
          ID_Utilizador_Criador: utilizador.sub,
          Tipo_Anuncio: TipoAnuncio.ALUGUER,
          Stock_Armazem: [
            criarStock({
              Quantidade_Total: 1,
              Quantidade_Venda: 0,
              Quantidade_Aluguer: 1,
            }),
          ],
        }),
      );

      await expect(
        service.criarPedidoAluguer(
          1,
          { dataInicio: '2030-06-15', dataFim: '2030-06-10' },
          coordenador,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve aceitar pedido com data futura e criar aluguer reservado', async () => {
      const pedido = criarPedidoAluguer();
      const aluguerCriado = criarAluguer();

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(aluguerCriado);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(aluguerCriado);

      expect(prismaService.aluguer_Artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Stock: 5,
          ID_Utilizador: coordenador.sub,
          Data_Entrega: new Date('2030-06-10T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
          Estado: 'Reservado',
        }),
        include: expect.any(Object),
      });
      expect(prismaService.interesse_Artigo.update).toHaveBeenCalledWith({
        where: { ID_Interesse: 100 },
        data: { Estado: 'Aceite' },
      });
      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.RESERVADO,
          Publicado_No_Marketplace: false,
        }),
      });
      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('deve aceitar pedido com data de hoje e criar aluguer ativo', async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const pedido = criarPedidoAluguer({
        Data_Inicio_Pretendida: hoje,
        Data_Fim_Pretendida: amanha,
        Data_Recolha_Prevista: amanha,
      });
      const aluguerCriado = criarAluguer({
        Data_Entrega: hoje,
        Data_Recolha_Prevista: amanha,
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(aluguerCriado);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(aluguerCriado);

      expect(prismaService.aluguer_Artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          Data_Entrega: hoje,
          Data_Recolha_Prevista: amanha,
          Estado: 'Ativo',
        }),
        include: expect.any(Object),
      });
    });

    it('deve manter anuncio ativo e publicado quando o artigo e de aluguer contínuo', async () => {
      const pedido = criarPedidoAluguer({
        Stock_Armazem: criarStock({
          Quantidade_Total: 1,
          Quantidade_Venda: 0,
          Quantidade_Aluguer: 1,
          Artigo: criarArtigo({
            ID_Utilizador_Criador: utilizador.sub,
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Aluguer_Continuo: true,
            Stock_Armazem: [],
          }),
        }),
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(criarAluguer());

      await service.aceitarPedidoAluguer(100, utilizador);

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.ATIVO,
          Publicado_No_Marketplace: true,
        }),
      });
    });

    it('deve manter anuncio reservado e oculto quando o artigo nao e de aluguer contínuo', async () => {
      const pedido = criarPedidoAluguer({
        Stock_Armazem: criarStock({
          Quantidade_Total: 1,
          Quantidade_Venda: 0,
          Quantidade_Aluguer: 1,
          Artigo: criarArtigo({
            ID_Utilizador_Criador: utilizador.sub,
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Aluguer_Continuo: false,
            Stock_Armazem: [],
          }),
        }),
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(criarAluguer());

      await service.aceitarPedidoAluguer(100, utilizador);

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.RESERVADO,
          Publicado_No_Marketplace: false,
        }),
      });
    });

    it('deve rejeitar aceitação com datas sobrepostas', async () => {
      const pedido = criarPedidoAluguer();

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(criarAluguer());

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.aluguer_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar segundo pedido para exatamente as mesmas datas', async () => {
      const pedido = criarPedidoAluguer();
      const aluguerSobreposto = criarAluguer({
        Estado: 'Reservado',
        Data_Entrega: new Date('2030-06-10T00:00:00.000Z'),
        Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(aluguerSobreposto);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).rejects.toThrow(
        'Já existe um aluguer ativo ou reservado para esse intervalo de datas.',
      );

      expect(prismaService.aluguer_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve permitir pedido que começa no dia em que outro termina', async () => {
      const pedido = criarPedidoAluguer({
        Data_Inicio_Pretendida: new Date('2030-06-15T00:00:00.000Z'),
        Data_Fim_Pretendida: new Date('2030-06-20T00:00:00.000Z'),
        Data_Recolha_Prevista: new Date('2030-06-20T00:00:00.000Z'),
      });
      const aluguerCriado = criarAluguer({
        Data_Entrega: new Date('2030-06-15T00:00:00.000Z'),
        Data_Recolha_Prevista: new Date('2030-06-20T00:00:00.000Z'),
        Estado: 'Reservado',
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(aluguerCriado);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(aluguerCriado);

      expect(prismaService.aluguer_Artigo.findFirst).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
          Data_Entrega: {
            lt: new Date('2030-06-20T00:00:00.000Z'),
          },
          Data_Recolha_Prevista: {
            gt: new Date('2030-06-15T00:00:00.000Z'),
          },
        },
      });
    });

    it('deve bloquear pedido que sobrepõe um dia', async () => {
      const pedido = criarPedidoAluguer({
        Data_Inicio_Pretendida: new Date('2030-06-14T00:00:00.000Z'),
        Data_Fim_Pretendida: new Date('2030-06-20T00:00:00.000Z'),
        Data_Recolha_Prevista: new Date('2030-06-20T00:00:00.000Z'),
      });

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(
        criarAluguer({
          Estado: 'Ativo',
          Data_Entrega: new Date('2030-06-10T00:00:00.000Z'),
          Data_Recolha_Prevista: new Date('2030-06-15T00:00:00.000Z'),
        }),
      );

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.aluguer_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve permitir novo aluguer quando o anterior está concluído', async () => {
      const pedido = criarPedidoAluguer();
      const aluguerCriado = criarAluguer();

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(aluguerCriado);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(aluguerCriado);

      expect(prismaService.aluguer_Artigo.findFirst).toHaveBeenCalledWith({
        where: {
          ID_Stock: 5,
          Estado: { in: ['Reservado', 'Ativo', 'Devolucao_Pendente'] },
          Data_Entrega: {
            lt: new Date('2030-06-15T00:00:00.000Z'),
          },
          Data_Recolha_Prevista: {
            gt: new Date('2030-06-10T00:00:00.000Z'),
          },
        },
      });
    });

    it('deve permitir novo aluguer quando o anterior está cancelado', async () => {
      const pedido = criarPedidoAluguer();
      const aluguerCriado = criarAluguer();

      prismaMock.interesse_Artigo.findUnique
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(pedido);
      prismaMock.aluguer_Artigo.findFirst.mockResolvedValue(null);
      prismaMock.aluguer_Artigo.create.mockResolvedValue(aluguerCriado);

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(aluguerCriado);

      expect(prismaService.aluguer_Artigo.create).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar pedido de aluguer', async () => {
      const pedido = criarPedidoAluguer({ Estado: 'Rejeitado' });
      prismaMock.interesse_Artigo.findUnique.mockResolvedValue(
        criarPedidoAluguer(),
      );
      prismaMock.interesse_Artigo.update.mockResolvedValue(pedido);

      await expect(
        service.rejeitarPedidoAluguer(100, utilizador),
      ).resolves.toEqual(pedido);

      expect(prismaService.interesse_Artigo.update).toHaveBeenCalledWith({
        where: { ID_Interesse: 100 },
        data: { Estado: 'Rejeitado' },
        include: expect.any(Object),
      });
      expect(prismaService.aluguer_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve marcar aluguer como devolvido pelo interessado', async () => {
      const aluguer = criarAluguer();
      const aluguerAtualizado = criarAluguer({
        Estado: 'Devolucao_Pendente',
      });
      prismaMock.aluguer_Artigo.findUnique.mockResolvedValue(aluguer);
      prismaMock.aluguer_Artigo.update.mockResolvedValue(aluguerAtualizado);

      await expect(
        service.marcarAluguerComoDevolvido(90, coordenador),
      ).resolves.toEqual(aluguerAtualizado);

      expect(prismaService.aluguer_Artigo.update).toHaveBeenCalledWith({
        where: { ID_Aluguer: 90 },
        data: { Estado: 'Devolucao_Pendente' },
        include: expect.any(Object),
      });
    });

    it('deve confirmar devolução pelo dono', async () => {
      const aluguer = criarAluguer({
        Stock_Armazem: criarStock({
          Quantidade_Total: 1,
          Quantidade_Venda: 0,
          Quantidade_Aluguer: 1,
          Artigo: criarArtigo({
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Aluguer_Continuo: false,
            Stock_Armazem: [],
          }),
        }),
      });
      const aluguerConcluido = criarAluguer({
        Estado: 'Concluido',
        Data_Recolha_Efetiva: new Date('2030-06-20T10:00:00.000Z'),
      });
      prismaMock.aluguer_Artigo.findUnique.mockResolvedValue(aluguer);
      prismaMock.aluguer_Artigo.update.mockResolvedValue(aluguerConcluido);

      await expect(
        service.confirmarDevolucaoAluguer(90, utilizador),
      ).resolves.toEqual(aluguerConcluido);

      expect(prismaService.aluguer_Artigo.update).toHaveBeenCalledWith({
        where: { ID_Aluguer: 90 },
        data: expect.objectContaining({
          Estado: 'Concluido',
          Data_Recolha_Efetiva: expect.any(Date),
        }),
        include: expect.any(Object),
      });
      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.CONCLUIDO,
          Publicado_No_Marketplace: false,
        }),
      });
    });

    it('deve reativar anuncio contínuo ao confirmar devolução', async () => {
      const aluguer = criarAluguer({
        Stock_Armazem: criarStock({
          Quantidade_Total: 1,
          Quantidade_Venda: 0,
          Quantidade_Aluguer: 1,
          Artigo: criarArtigo({
            Tipo_Anuncio: TipoAnuncio.ALUGUER,
            Aluguer_Continuo: true,
            Stock_Armazem: [],
          }),
        }),
      });
      prismaMock.aluguer_Artigo.findUnique.mockResolvedValue(aluguer);
      prismaMock.aluguer_Artigo.update.mockResolvedValue(
        criarAluguer({
          Estado: 'Concluido',
          Data_Recolha_Efetiva: new Date('2030-06-20T10:00:00.000Z'),
        }),
      );

      await service.confirmarDevolucaoAluguer(90, utilizador);

      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Estado_Anuncio: EstadoAnuncio.ATIVO,
          Publicado_No_Marketplace: true,
        }),
      });
    });

    it('deve impedir operações sem permissão sobre o aluguer', async () => {
      prismaMock.interesse_Artigo.findUnique.mockResolvedValue(
        criarPedidoAluguer({
          Stock_Armazem: criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
            Artigo: criarArtigo({
              ID_Utilizador_Criador: 999,
              Tipo_Anuncio: TipoAnuncio.ALUGUER,
              Stock_Armazem: [],
            }),
          }),
        }),
      );
      prismaMock.aluguer_Artigo.findUnique.mockResolvedValue(
        criarAluguer({
          Stock_Armazem: criarStock({
            Quantidade_Total: 1,
            Quantidade_Venda: 0,
            Quantidade_Aluguer: 1,
            Artigo: criarArtigo({
              ID_Utilizador_Criador: 999,
              Tipo_Anuncio: TipoAnuncio.ALUGUER,
              Stock_Armazem: [],
            }),
          }),
        }),
      );

      await expect(
        service.aceitarPedidoAluguer(100, utilizador),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.rejeitarPedidoAluguer(100, utilizador),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.confirmarDevolucaoAluguer(90, utilizador),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listar interesses e inventario', () => {
    it('deve listar interesses do anuncio para o dono', async () => {
      const interesses = [{ ID_Interesse: 1 }];
      prismaMock.artigo.findUnique.mockResolvedValue(criarArtigo());
      prismaMock.interesse_Artigo.findMany.mockResolvedValue(interesses);

      await expect(
        service.listarInteressesDoAnuncio(1, utilizador),
      ).resolves.toEqual(interesses);

      expect(prismaService.interesse_Artigo.findMany).toHaveBeenCalledWith({
        where: { ID_Stock: 5 },
        include: { Utilizador: { include: { Pessoa: true } } },
        orderBy: [{ Data_Registo: 'desc' }],
      });
    });

    it('deve listar inventario da escola apenas para coordenador', async () => {
      prismaMock.artigo.findMany.mockResolvedValue([]);

      await expect(
        service.listarInventarioDaEscola(coordenador),
      ).resolves.toEqual([]);

      expect(prismaService.artigo.findMany).toHaveBeenCalledWith({
        where: { Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA },
        include: expect.any(Object),
        orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
      });

      await expect(
        service.listarInventarioDisponivelParaPublicacao(utilizador),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('criarItemInventario', () => {
    it('deve criar item de inventario e stock como coordenador', async () => {
      const item = criarArtigo({
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Publicado_No_Marketplace: false,
      });
      prismaMock.artigo.create.mockResolvedValue(item);

      await expect(
        service.criarItemInventario(
          {
            titulo: 'Saia',
            descricao: 'Nova',
            quantidade: 6,
            idEstado: 2,
            idTamanho: 3,
          } as any,
          coordenador,
        ),
      ).resolves.toEqual(item);

      expect(prismaService.artigo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          Nome: 'Saia',
          Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
          Publicado_No_Marketplace: false,
          ID_Utilizador_Criador: coordenador.sub,
        }),
      });
      expect(prismaService.stock_Armazem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ID_Artigo: 1,
          ID_Estado: 2,
          ID_Tamanho: 3,
          Quantidade_Total: 6,
          Quantidade_Venda: 0,
          Quantidade_Aluguer: 0,
        }),
      });
    });

    it('deve rejeitar criacao de inventario por nao coordenador', async () => {
      await expect(
        service.criarItemInventario(
          { titulo: 'Saia', quantidade: 1 } as any,
          utilizador,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
