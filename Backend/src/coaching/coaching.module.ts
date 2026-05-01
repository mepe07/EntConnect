import { Module } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { GestaoEstudiosService } from './estudios/gestaoEstudios.service'; // Importa o serviço de gestão de estúdios
import { ModalidadeController } from './modalidade.controller';
import { ModalidadeService } from './modalidade/modalidade.service';

@Module({
  controllers: [CoachingController, ModalidadeController],
  providers: [CoachingService, GestaoEstudiosService, ModalidadeService],
})
export class CoachingModule {}
