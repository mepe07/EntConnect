import { Module } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { GestaoEstudiosService } from './estudios/gestaoEstudios.service';
import { ModalidadeController } from './modalidade.controller';
import { ModalidadeService } from './modalidade/modalidade.service';
/**
 * Modulo responsavel por agrupar os recursos de Coaching.
 */

@Module({
  controllers: [CoachingController, ModalidadeController],
  providers: [CoachingService, GestaoEstudiosService, ModalidadeService],
})
export class CoachingModule {}
