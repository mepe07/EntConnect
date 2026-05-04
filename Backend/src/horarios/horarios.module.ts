import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosController } from './horarios.controller';
import { HorariosService } from './horarios.service';
/**
 * Modulo responsavel por agrupar os recursos de Horarios.
 */

@Module({
  imports: [PrismaModule],
  controllers: [HorariosController],
  providers: [HorariosService],
})
export class HorariosModule {}
