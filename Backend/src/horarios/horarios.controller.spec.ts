import { Test, TestingModule } from '@nestjs/testing';

import { HorariosController } from './horarios.controller';
import { HorariosService } from './horarios.service';

describe('HorariosController', () => {
  let controller: HorariosController;

  const horariosServiceMock = {
    getDiasSemana: jest.fn(),
    getAllHorarios: jest.fn(),
    getHorarioById: jest.fn(),
    createHorario: jest.fn(),
    updateHorario: jest.fn(),
    deleteHorario: jest.fn(),
    createExcecao: jest.fn(),
    deleteExcecao: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HorariosController],
      providers: [{ provide: HorariosService, useValue: horariosServiceMock }],
    }).compile();

    controller = module.get<HorariosController>(HorariosController);
    jest.resetAllMocks();
  });

  it('deve delegar todos os endpoints no service', async () => {
    horariosServiceMock.getDiasSemana.mockResolvedValue(['dias']);
    horariosServiceMock.getAllHorarios.mockResolvedValue(['horarios']);
    horariosServiceMock.getHorarioById.mockResolvedValue({ id: 1 });
    horariosServiceMock.createHorario.mockResolvedValue({ id: 2 });
    horariosServiceMock.updateHorario.mockResolvedValue({ id: 3 });
    horariosServiceMock.deleteHorario.mockResolvedValue({ id: 4 });
    horariosServiceMock.createExcecao.mockResolvedValue({ id: 5 });
    horariosServiceMock.deleteExcecao.mockResolvedValue({ id: 6 });

    await expect(controller.getDiasSemana()).resolves.toEqual(['dias']);
    await expect(controller.findAll()).resolves.toEqual(['horarios']);
    await expect(controller.findOne(1)).resolves.toEqual({ id: 1 });
    await expect(controller.create({ diaSemana: 1 } as any)).resolves.toEqual({ id: 2 });
    await expect(controller.update(1, { ativa: false })).resolves.toEqual({ id: 3 });
    await expect(controller.remove(1)).resolves.toEqual({ id: 4 });
    await expect(controller.createExcecao(1, { dataCancelada: '2026-05-10' })).resolves.toEqual({ id: 5 });
    await expect(controller.removeExcecao(5)).resolves.toEqual({ id: 6 });

    expect(horariosServiceMock.getHorarioById).toHaveBeenCalledWith(1);
    expect(horariosServiceMock.createExcecao).toHaveBeenCalledWith(1, { dataCancelada: '2026-05-10' });
  });
});
