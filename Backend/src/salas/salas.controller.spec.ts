import { Test, TestingModule } from '@nestjs/testing';

import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';

describe('SalasController', () => {
  let controller: SalasController;

  const salasServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalasController],
      providers: [{ provide: SalasService, useValue: salasServiceMock }],
    }).compile();

    controller = module.get<SalasController>(SalasController);
    jest.resetAllMocks();
  });

  it('deve delegar CRUD no service convertendo IDs', async () => {
    salasServiceMock.create.mockResolvedValue({ ID_Sala: 1 });
    salasServiceMock.findAll.mockResolvedValue([]);
    salasServiceMock.findOne.mockResolvedValue('sala');
    salasServiceMock.update.mockResolvedValue({ ID_Sala: 2 });
    salasServiceMock.remove.mockResolvedValue({ ID_Sala: 3 });

    await controller.create({ nome: 'A' } as any);
    await controller.findAll();
    await controller.findOne('1');
    await controller.update('2', { nome: 'B' } as any);
    await controller.remove('3');

    expect(salasServiceMock.findOne).toHaveBeenCalledWith(1);
    expect(salasServiceMock.update).toHaveBeenCalledWith(2, { nome: 'B' });
    expect(salasServiceMock.remove).toHaveBeenCalledWith(3);
  });
});
