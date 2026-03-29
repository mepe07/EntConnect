import { Test, TestingModule } from '@nestjs/testing';
import { FaturacaoService } from './faturacao.service';

describe('FaturacaoService', () => {
  let service: FaturacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FaturacaoService],
    }).compile();

    service = module.get<FaturacaoService>(FaturacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
