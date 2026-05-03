import { Test, TestingModule } from '@nestjs/testing';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';

describe('CalendarioController', () => {
  let controller: CalendarioController;

  const calendarioServiceMock = {
    getCalendarItems: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarioController],
      providers: [{ provide: CalendarioService, useValue: calendarioServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CalendarioController>(CalendarioController);
    jest.resetAllMocks();
  });

  it('deve delegar o intervalo de datas no service', async () => {
    const resposta = { eventos: [], coachings: [] };
    calendarioServiceMock.getCalendarItems.mockResolvedValue(resposta);

    await expect(controller.getCalendario('2026-05-01', '2026-05-31')).resolves.toBe(resposta);
    expect(calendarioServiceMock.getCalendarItems).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
  });
});
