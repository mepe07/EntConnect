import { Test, TestingModule } from '@nestjs/testing';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

describe('EventosController', () => {
  let controller: EventosController;

  const eventosServiceMock = {
    listarEventosPublicos: jest.fn(),
    listarEventosLoginToast: jest.fn(),
    obterEventoPublicoPorSlug: jest.fn(),
    listarEventosGestao: jest.fn(),
    obterEventoGestao: jest.fn(),
    criarEvento: jest.fn(),
    atualizarEvento: jest.fn(),
    removerEvento: jest.fn(),
    reativarEvento: jest.fn(),
  };

  const req = { user: { sub: 1, role: 'Coordenador' } as any };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [{ provide: EventosService, useValue: eventosServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<EventosController>(EventosController);
    jest.resetAllMocks();
  });

  it('deve delegar rotas públicas', async () => {
    eventosServiceMock.listarEventosPublicos.mockResolvedValue([]);
    eventosServiceMock.listarEventosLoginToast.mockResolvedValue([]);
    eventosServiceMock.obterEventoPublicoPorSlug.mockResolvedValue({
      slug: 'workshop',
    });

    await controller.listarEventosPublicos({ pesquisa: 'work' } as any);
    await controller.listarEventosLoginToast();
    await controller.obterEventoPublicoPorSlug('workshop');

    expect(eventosServiceMock.listarEventosPublicos).toHaveBeenCalledWith({
      pesquisa: 'work',
    });
    expect(eventosServiceMock.obterEventoPublicoPorSlug).toHaveBeenCalledWith(
      'workshop',
    );
  });

  it('deve delegar rotas de gestão com utilizador autenticado', async () => {
    eventosServiceMock.listarEventosGestao.mockResolvedValue([]);
    eventosServiceMock.obterEventoGestao.mockResolvedValue({ id: 1 });
    eventosServiceMock.criarEvento.mockResolvedValue({ id: 2 });
    eventosServiceMock.atualizarEvento.mockResolvedValue({ id: 3 });
    eventosServiceMock.removerEvento.mockResolvedValue({ id: 4 });
    eventosServiceMock.reativarEvento.mockResolvedValue({ id: 5 });

    await controller.listarEventosGestao({ ativo: true } as any, req);
    await controller.obterEventoGestao(1, req);
    await controller.criarEvento({ titulo: 'Evento' } as any, req, undefined);
    await controller.atualizarEvento(
      2,
      { titulo: 'Novo' } as any,
      req,
      undefined,
    );
    await controller.removerEvento(3, req);
    await controller.reativarEvento(4, req);

    expect(eventosServiceMock.listarEventosGestao).toHaveBeenCalledWith(
      { ativo: true },
      req.user,
    );
    expect(eventosServiceMock.criarEvento).toHaveBeenCalledWith(
      { titulo: 'Evento' },
      req.user,
      undefined,
    );
    expect(eventosServiceMock.atualizarEvento).toHaveBeenCalledWith(
      2,
      { titulo: 'Novo' },
      req.user,
      undefined,
    );
  });
});
