import { Module } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { GestaoEstudiosService } from './estudios/gestaoEstudios.service'; // Importa o serviço de gestão de estúdios

@Module({
  controllers: [CoachingController],
  providers: [CoachingService, GestaoEstudiosService],
})
export class CoachingModule {}
