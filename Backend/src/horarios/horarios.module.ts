import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosController } from './horarios.controller';
import { HorariosService } from './horarios.service';

@Module({
  imports: [PrismaModule],
  controllers: [HorariosController],
  providers: [HorariosService],
})
/**
 * Módulo responsável pela gestão de horários fixos e respetivas exceções.
 */
export class HorariosModule {}
