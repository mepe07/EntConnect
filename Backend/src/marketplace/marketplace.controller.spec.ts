import { Test, TestingModule } from '@nestjs/testing';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;

  const marketplaceServiceMock = {
    listarAnunciosModeracao: jest.fn(),
    listarRegistoModeracao: jest.fn(),
    moderarAnuncio: jest.fn(),
    listarInventarioDaEscola: jest.fn(),
    listarInventarioDisponivelParaPublicacao: jest.fn(),
    publicarInventarioDaEscola: jest.fn(),
    criarItemInventario: jest.fn(),
    listarAnuncios: jest.fn(),
    listarMeusAnuncios: jest.fn(),
    obterAnuncio: jest.fn(),
    criarAnuncio: jest.fn(),
    atualizarAnuncio: jest.fn(),
    alterarEstado: jest.fn(),
    removerAnuncio: jest.fn(),
    registarInteresse: jest.fn(),
    listarInteressesDoAnuncio: jest.fn(),
  };

  const req = { user: { sub: 1, role: 'Coordenador' } as any };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [{ provide: MarketplaceService, useValue: marketplaceServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MarketplaceController>(MarketplaceController);
    jest.resetAllMocks();

    Object.values(marketplaceServiceMock).forEach((mock) => mock.mockResolvedValue({ ok: true }));
  });

  it('deve delegar rotas de moderação e inventário', async () => {
    await controller.listarAnunciosModeracao(req);
    await controller.listarRegistoModeracao(req);
    await controller.moderarAnuncio('10', { acao: 'REMOVER' } as any, req);
    await controller.listarInventarioDaEscola(req);
    await controller.listarInventarioDisponivelParaPublicacao(req);
    await controller.publicarInventarioDaEscola({ idArtigo: 1 } as any, req);
    await controller.criarItemInventario({ titulo: 'Item' } as any, req, undefined);

    expect(marketplaceServiceMock.moderarAnuncio).toHaveBeenCalledWith(10, { acao: 'REMOVER' }, req.user);
    expect(marketplaceServiceMock.criarItemInventario).toHaveBeenCalledWith({ titulo: 'Item' }, req.user, undefined);
  });

  it('deve delegar rotas gerais do marketplace convertendo IDs', async () => {
    await controller.listarAnuncios({ pesquisa: 'sapatos' } as any);
    await controller.listarMeusAnuncios(req);
    await controller.obterAnuncio('20');
    await controller.criarAnuncio({ titulo: 'Anúncio' } as any, req, undefined);
    await controller.atualizarAnuncio('21', { titulo: 'Novo' } as any, req, undefined);
    await controller.alterarEstado('22', { estado: 'Pausado' } as any, req);
    await controller.removerAnuncio('23', req);
    await controller.registarInteresse('24', { mensagem: 'Interesse' } as any, req);
    await controller.listarInteressesDoAnuncio('25', req);

    expect(marketplaceServiceMock.obterAnuncio).toHaveBeenCalledWith(20);
    expect(marketplaceServiceMock.atualizarAnuncio).toHaveBeenCalledWith(21, { titulo: 'Novo' }, req.user, undefined);
    expect(marketplaceServiceMock.alterarEstado).toHaveBeenCalledWith(22, { estado: 'Pausado' }, req.user);
    expect(marketplaceServiceMock.registarInteresse).toHaveBeenCalledWith(24, { mensagem: 'Interesse' }, req.user);
    expect(marketplaceServiceMock.listarInteressesDoAnuncio).toHaveBeenCalledWith(25, req.user);
  });
});
