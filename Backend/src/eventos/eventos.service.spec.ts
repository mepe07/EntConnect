import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../auth/enums/roles.enum';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventosService } from './eventos.service';

describe('EventosService', () => {
  let service: EventosService;

  const prismaMock = {
    evento: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const blobsServiceMock = {
    uploadFicheiro: jest.fn(),
    apagarFicheiro: jest.fn(),
  };

  const utilizador: UtilizadorAutenticado = {
    sub: 1,
    username: 'coord',
    role: Role.COORDENADOR,
    idPessoa: 10,
  };

  const criarEvento = (override: Record<string, unknown> = {}) =>
    ({
      ID_Evento: 1,
      Titulo: 'Workshop de Salsa',
      Slug: 'workshop-de-salsa',
      Resumo: 'Resumo',
      Descricao: 'Descrição',
      Tipo: 'Evento',
      Local: 'Estúdio A',
      Imagem: null,
      Data_Inicio: new Date('2026-05-10T10:00:00.000Z'),
      Data_Fim: null,
      Publico: true,
      Publicado: true,
      Destaque: false,
      Destaque_Login: false,
      Ativo: true,
      ID_Utilizador_Criador: 1,
      ID_Utilizador_Atualizacao: null,
      ID_Utilizador_Remocao: null,
      Data_Criacao: new Date('2026-05-01T10:00:00.000Z'),
      Data_Atualizacao: new Date('2026-05-01T10:00:00.000Z'),
      Data_Remocao: null,
      ...override,
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BlobsService, useValue: blobsServiceMock },
      ],
    }).compile();

    service = module.get<EventosService>(EventosService);
    jest.resetAllMocks();
  });

  it('deve listar eventos públicos com filtros e mapear campos', async () => {
    prismaMock.evento.findMany.mockResolvedValue([criarEvento()]);

    const resultado = await service.listarEventosPublicos({
      pesquisa: 'salsa',
      limite: 5,
    } as any);

    expect(prismaMock.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        where: expect.objectContaining({
          Publico: true,
          Publicado: true,
          Ativo: true,
          AND: expect.any(Array),
        }),
      }),
    );
    expect(resultado[0]).toEqual(
      expect.objectContaining({
        id: 1,
        titulo: 'Workshop de Salsa',
        slug: 'workshop-de-salsa',
      }),
    );
  });

  it('deve listar eventos do toast de login em formato resumido', async () => {
    prismaMock.evento.findMany.mockResolvedValue([
      criarEvento({ Destaque_Login: true }),
    ]);

    const resultado = await service.listarEventosLoginToast();

    expect(prismaMock.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ Destaque_Login: true }),
        take: 3,
      }),
    );
    expect(resultado[0]).toEqual(
      expect.objectContaining({
        id: 1,
        titulo: 'Workshop de Salsa',
        slug: 'workshop-de-salsa',
      }),
    );
  });

  it('deve obter evento público por slug e esconder evento não público', async () => {
    prismaMock.evento.findUnique.mockResolvedValueOnce(criarEvento());
    await expect(
      service.obterEventoPublicoPorSlug('workshop'),
    ).resolves.toEqual(expect.objectContaining({ slug: 'workshop-de-salsa' }));

    prismaMock.evento.findUnique.mockResolvedValueOnce(
      criarEvento({ Publicado: false }),
    );
    await expect(service.obterEventoPublicoPorSlug('rascunho')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve proteger listagem de gestão por role', async () => {
    await expect(
      service.listarEventosGestao({}, { ...utilizador, role: Role.PROFESSOR }),
    ).rejects.toThrow(ForbiddenException);

    prismaMock.evento.findMany.mockResolvedValue([criarEvento()]);
    await expect(
      service.listarEventosGestao({ ativo: true } as any, utilizador),
    ).resolves.toHaveLength(1);
  });

  it('deve criar evento com slug único e dados normalizados', async () => {
    prismaMock.evento.findFirst
      .mockResolvedValueOnce({ ID_Evento: 1 })
      .mockResolvedValueOnce(null);
    prismaMock.evento.create.mockResolvedValue(
      criarEvento({ Slug: 'workshop-2' }),
    );

    await expect(
      service.criarEvento(
        {
          titulo: ' Workshop ',
          dataInicio: '2026-05-10T10:00:00.000Z',
          resumo: ' Resumo ',
          publicado: true,
        } as any,
        utilizador,
      ),
    ).resolves.toEqual(expect.objectContaining({ slug: 'workshop-2' }));

    expect(prismaMock.evento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Titulo: 'Workshop',
        Slug: 'workshop-2',
        Resumo: 'Resumo',
        ID_Utilizador_Criador: 1,
      }),
    });
  });

  it('deve rejeitar datas inválidas ao criar evento', async () => {
    await expect(
      service.criarEvento(
        {
          titulo: 'Evento',
          dataInicio: '2026-05-11',
          dataFim: '2026-05-10',
        } as any,
        utilizador,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve atualizar, remover e reativar evento existente', async () => {
    prismaMock.evento.findUnique.mockResolvedValue(criarEvento());
    prismaMock.evento.update
      .mockResolvedValueOnce(criarEvento({ Titulo: 'Novo' }))
      .mockResolvedValueOnce(criarEvento({ Ativo: false }))
      .mockResolvedValueOnce(criarEvento({ Ativo: true }));

    await expect(
      service.atualizarEvento(1, { titulo: 'Novo' } as any, utilizador),
    ).resolves.toEqual(expect.objectContaining({ titulo: 'Novo' }));
    await expect(service.removerEvento(1, utilizador)).resolves.toEqual(
      expect.objectContaining({ ativo: false }),
    );
    await expect(service.reativarEvento(1, utilizador)).resolves.toEqual(
      expect.objectContaining({ ativo: true }),
    );

    expect(prismaMock.evento.update).toHaveBeenNthCalledWith(2, {
      where: { ID_Evento: 1 },
      data: expect.objectContaining({ Ativo: false, ID_Utilizador_Remocao: 1 }),
    });
  });
});
