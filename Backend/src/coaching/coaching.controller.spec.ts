import { Test, TestingModule } from '@nestjs/testing';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';

describe('CoachingController', () => {
  let controller: CoachingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachingController],
      providers: [CoachingService],
    }).compile();

    controller = module.get<CoachingController>(CoachingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
