import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
/**
 * Modulo responsavel por agrupar os recursos de Eventos.
 */

@Module({
  imports: [AuthModule],
  controllers: [EventosController],
  providers: [EventosService],
})
export class EventosModule {}
