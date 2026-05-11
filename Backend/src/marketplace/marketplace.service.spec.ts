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

  describe('criarAnuncio', () => {
    it('deve criar anuncio e stock numa transacao', async () => {
      const dto = {
        titulo: 'Fato',
        descricao: 'Fato de danca',
        tipoAnuncio: TipoAnuncio.VENDA,
        quantidadeTotal: 3,
        quantidadeDisponivel: 2,
        idTamanho: 1,
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
          ID_Tamanho: 1,
        }),
      });
    });

    it('deve guardar foto quando recebe ficheiro', async () => {
      const dto = {
        titulo: 'Casaco',
        tipoAnuncio: TipoAnuncio.VENDA,
        quantidadeTotal: 1,
        quantidadeDisponivel: 1,
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
        data: expect.objectContaining({ Foto: 'https://foto' }),
      });
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
            quantidadeVenda: 3,
            quantidadeAluguer: 1,
          } as any,
          utilizador,
        ),
      ).resolves.toEqual(artigoAtualizado);

      expect(prismaService.stock_Armazem.update).toHaveBeenCalledWith({
        where: { ID_Stock: 5 },
        data: expect.objectContaining({
          Quantidade_Total: 5,
          Quantidade_Venda: 3,
          Quantidade_Aluguer: 1,
        }),
      });
      expect(prismaService.artigo.update).toHaveBeenCalledWith({
        where: { ID_Artigo: 1 },
        data: expect.objectContaining({
          Nome: 'Novo titulo',
          Tipo_Anuncio: TipoAnuncio.AMBOS,
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
          Publicado_No_Marketplace: true,
        }),
        include: expect.any(Object),
      });
    });

    it('deve rejeitar publicacao sem role de coordenador', async () => {
      await expect(
        service.publicarInventarioDaEscola({ idArtigo: 1 } as any, utilizador),
      ).rejects.toThrow(ForbiddenException);

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
            dataRecolhaPrevista: '2026-06-01',
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
          Data_Recolha_Prevista: new Date('2026-06-01'),
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
          { titulo: 'Saia', descricao: 'Nova', quantidade: 6 } as any,
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
