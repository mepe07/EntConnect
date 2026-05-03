import { Test, TestingModule } from '@nestjs/testing';

import { ModalidadeController } from './modalidade.controller';
import { ModalidadeService } from './modalidade/modalidade.service';

describe('ModalidadeController', () => {
  let controller: ModalidadeController;

  const modalidadeServiceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModalidadeController],
      providers: [{ provide: ModalidadeService, useValue: modalidadeServiceMock }],
    }).compile();

    controller = module.get<ModalidadeController>(ModalidadeController);
    jest.resetAllMocks();
  });

  it('deve delegar operações CRUD no service', async () => {
    modalidadeServiceMock.findAll.mockResolvedValue([]);
    modalidadeServiceMock.create.mockResolvedValue({ ID_Modalidade: 1 });
    modalidadeServiceMock.update.mockResolvedValue({ ID_Modalidade: 2 });
    modalidadeServiceMock.remove.mockResolvedValue({ ID_Modalidade: 3 });

    await expect(controller.findAll()).resolves.toEqual([]);
    await expect(controller.create({ Descricao: 'Salsa' })).resolves.toEqual({ ID_Modalidade: 1 });
    await expect(controller.update(2, { Descricao: 'Kizomba' })).resolves.toEqual({ ID_Modalidade: 2 });
    await expect(controller.remove(3)).resolves.toEqual({ ID_Modalidade: 3 });

    expect(modalidadeServiceMock.update).toHaveBeenCalledWith(2, { Descricao: 'Kizomba' });
    expect(modalidadeServiceMock.remove).toHaveBeenCalledWith(3);
  });
});
