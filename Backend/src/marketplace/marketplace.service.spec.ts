// Ficheiro: src/marketplace/marketplace.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';

import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { TipoAnuncio } from './enums/tipo-anuncio.enum';
import { EstadoAnuncio } from './enums/estado-anuncio.enum';
import { OrigemRegisto } from './enums/origem-registo.enum';
import { TipoInteresse } from './enums/tipo-interesse.enum';
import { AcaoModeracao } from './enums/acao-moderacao.enum';

describe('MarketplaceService', () => {
    let service: MarketplaceService;

    // Mock do PrismaService.
    // Evita usar a base de dados real durante os testes unitários.
    const prismaMock = {
        artigo: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
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

    // Mock do BlobsService.
    // Evita fazer upload real para o Azure durante os testes.
    const blobsServiceMock = {
        guardarFotosMarketplace: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MarketplaceService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
                {
                    provide: BlobsService,
                    useValue: blobsServiceMock,
                },
            ],
        }).compile();

        service = module.get<MarketplaceService>(MarketplaceService);

        // Limpa chamadas e valores antigos para garantir isolamento entre testes.
        jest.resetAllMocks();

        // Simula o comportamento de uma transação Prisma.
        // Em vez de abrir uma transação real, executa a callback com o próprio mock.
        prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    });

    // Helper para criar um utilizador autenticado fake.
    const criarUtilizadorFake = (
        override: Partial<UtilizadorAutenticado> = {},
    ): UtilizadorAutenticado => ({
        sub: 1,
        username: 'coordenadora',
        role: 'Coordenador',
        idPessoa: 10,
        ...override,
    });

    // Helper para criar stock fake associado a um artigo.
    const criarStockFake = (override: Record<string, unknown> = {}) => ({
        ID_Stock: 50,
        ID_Artigo: 100,
        Quantidade_Total: 5,
        Quantidade_Venda: 0,
        Quantidade_Aluguer: 0,
        ID_Cor: null,
        ID_Estado: null,
        ID_Tamanho: null,
        ...override,
    });

    // Helper para criar um artigo fake reutilizável.
    const criarArtigoFake = (override: Record<string, unknown> = {}) => ({
        ID_Artigo: 100,
        Nome: 'Camisola escolar',
        Descricao: 'Camisola em bom estado',
        Foto: null,
        Notas: null,
        Tipo_Anuncio: TipoAnuncio.VENDA,
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
        Estado_Anuncio: EstadoAnuncio.ATIVO,
        Publicado_No_Marketplace: false,
        ID_Utilizador_Criador: 1,
        ID_Utilizador_Moderador: null,
        Motivo_Moderacao: null,
        Data_Moderacao: null,
        Data_Criacao: new Date(),
        Data_Atualizacao: new Date(),
        Stock_Armazem: [criarStockFake()],
        ...override,
    });

    it('deve publicar um item do inventário com distribuição real para venda e aluguer', async () => {
        const utilizador = criarUtilizadorFake();
        const artigo = criarArtigoFake({
            Stock_Armazem: [
                criarStockFake({
                    Quantidade_Total: 3,
                }),
            ],
        });

        prismaMock.artigo.findUnique.mockResolvedValue(artigo);
        prismaMock.artigo.update.mockResolvedValue({
            ...artigo,
            Publicado_No_Marketplace: true,
            Tipo_Anuncio: TipoAnuncio.AMBOS,
        });

        const resultado = await service.publicarInventarioDaEscola(
            {
                idArtigo: 100,
                tipoAnuncio: TipoAnuncio.AMBOS,
                quantidadeVenda: 2,
                quantidadeAluguer: 1,
            },
            utilizador,
        );

        expect(prismaMock.stock_Armazem.update).toHaveBeenCalledWith({
            where: { ID_Stock: 50 },
            data: {
                Quantidade_Venda: 2,
                Quantidade_Aluguer: 1,
            },
        });

        expect(prismaMock.artigo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ID_Artigo: 100 },
                data: expect.objectContaining({
                    Tipo_Anuncio: TipoAnuncio.AMBOS,
                    Estado_Anuncio: EstadoAnuncio.ATIVO,
                    Publicado_No_Marketplace: true,
                }),
            }),
        );

        expect(resultado.Tipo_Anuncio).toBe(TipoAnuncio.AMBOS);
    });

    it('deve rejeitar publicação quando a distribuição ultrapassa o stock total', async () => {
        const utilizador = criarUtilizadorFake();
        const artigo = criarArtigoFake({
            Stock_Armazem: [
                criarStockFake({
                    Quantidade_Total: 3,
                }),
            ],
        });

        prismaMock.artigo.findUnique.mockResolvedValue(artigo);

        await expect(
            service.publicarInventarioDaEscola(
                {
                    idArtigo: 100,
                    tipoAnuncio: TipoAnuncio.AMBOS,
                    quantidadeVenda: 2,
                    quantidadeAluguer: 2,
                },
                utilizador,
            ),
        ).rejects.toThrow(
            new BadRequestException(
                'A quantidade disponível no Marketplace não pode ser maior do que a quantidade total.',
            ),
        );

        expect(prismaMock.stock_Armazem.update).not.toHaveBeenCalled();
        expect(prismaMock.artigo.update).not.toHaveBeenCalled();
    });

    it('deve impedir um utilizador que não é coordenador de publicar inventário da escola', async () => {
        const utilizador = criarUtilizadorFake({
            role: 'Professor',
        });

        await expect(
            service.publicarInventarioDaEscola(
                {
                    idArtigo: 100,
                    tipoAnuncio: TipoAnuncio.VENDA,
                    quantidadeDisponivel: 1,
                },
                utilizador,
            ),
        ).rejects.toThrow(
            new ForbiddenException('Apenas a coordenadora pode gerir o inventário da escola.'),
        );

        expect(prismaMock.artigo.findUnique).not.toHaveBeenCalled();
    });

    it('deve registar interesse num anúncio ativo e publicado', async () => {
        const utilizadorInteressado = criarUtilizadorFake({
            sub: 2,
            username: 'professor',
            role: 'Professor',
            idPessoa: 20,
        });

        const artigo = criarArtigoFake({
            ID_Utilizador_Criador: 1,
            Publicado_No_Marketplace: true,
            Estado_Anuncio: EstadoAnuncio.ATIVO,
            Stock_Armazem: [criarStockFake({ ID_Stock: 70 })],
        });

        prismaMock.artigo.findUnique.mockResolvedValue(artigo);
        prismaMock.interesse_Artigo.create.mockResolvedValue({
            ID_Interesse: 1,
            ID_Stock: 70,
            ID_Utilizador: 2,
        });

        await service.registarInteresse(
            100,
            {
                mensagem: 'Tenho interesse neste artigo.',
                tipo: TipoInteresse.CONTACTO,
            },
            utilizadorInteressado,
        );

        expect(prismaMock.interesse_Artigo.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ID_Stock: 70,
                ID_Utilizador: 2,
                Mensagem: 'Tenho interesse neste artigo.',
                Tipo: TipoInteresse.CONTACTO,
                Estado: 'Novo',
            }),
        });
    });

    it('deve impedir que o dono registe interesse no próprio anúncio', async () => {
        const dono = criarUtilizadorFake({
            sub: 1,
        });

        const artigo = criarArtigoFake({
            ID_Utilizador_Criador: 1,
            Publicado_No_Marketplace: true,
            Estado_Anuncio: EstadoAnuncio.ATIVO,
            Stock_Armazem: [criarStockFake()],
        });

        prismaMock.artigo.findUnique.mockResolvedValue(artigo);

        await expect(
            service.registarInteresse(
                100,
                {
                    mensagem: 'Tenho interesse no meu próprio anúncio.',
                    tipo: TipoInteresse.CONTACTO,
                },
                dono,
            ),
        ).rejects.toThrow(
            new BadRequestException('Não podes registar interesse no teu próprio anúncio.'),
        );

        expect(prismaMock.interesse_Artigo.create).not.toHaveBeenCalled();
    });

    it('deve permitir à coordenadora remover um anúncio através da moderação', async () => {
        const coordenadora = criarUtilizadorFake();
        const artigo = criarArtigoFake({
            Publicado_No_Marketplace: true,
            Estado_Anuncio: EstadoAnuncio.ATIVO,
        });

        prismaMock.artigo.findUnique.mockResolvedValue(artigo);
        prismaMock.artigo.update.mockResolvedValue({
            ...artigo,
            Estado_Anuncio: EstadoAnuncio.REMOVIDO,
            Publicado_No_Marketplace: false,
            ID_Utilizador_Moderador: coordenadora.sub,
            Motivo_Moderacao: 'Conteúdo inadequado.',
        });

        const resultado = await service.moderarAnuncio(
            100,
            {
                acao: AcaoModeracao.REMOVER,
                motivo: 'Conteúdo inadequado.',
            },
            coordenadora,
        );

        expect(prismaMock.artigo.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ID_Artigo: 100 },
                data: expect.objectContaining({
                    Estado_Anuncio: EstadoAnuncio.REMOVIDO,
                    Publicado_No_Marketplace: false,
                    ID_Utilizador_Moderador: coordenadora.sub,
                    Motivo_Moderacao: 'Conteúdo inadequado.',
                }),
            }),
        );

        expect(resultado.Estado_Anuncio).toBe(EstadoAnuncio.REMOVIDO);

        expect(prismaMock.registo_Moderacao_Marketplace.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ID_Artigo: 100,
                ID_Utilizador_Moderador: coordenadora.sub,
                Acao: AcaoModeracao.REMOVER,
                Estado_Anterior: EstadoAnuncio.ATIVO,
                Estado_Novo: EstadoAnuncio.REMOVIDO,
                Motivo: 'Conteúdo inadequado.',
            }),
        });
    });
});