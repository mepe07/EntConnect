import { Test, TestingModule } from '@nestjs/testing';
import { CoachingService } from './coaching.service';

describe('CoachingService', () => {
  let service: CoachingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoachingService],
    }).compile();

    service = module.get<CoachingService>(CoachingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
