import { Test, TestingModule } from '@nestjs/testing';
import { FaturacaoController } from './faturacao.controller';
import { FaturacaoService } from './faturacao.service';

describe('FaturacaoController', () => {
  let controller: FaturacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaturacaoController],
      providers: [FaturacaoService],
    }).compile();

    controller = module.get<FaturacaoController>(FaturacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
