import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';
/**
 * Modulo responsavel por agrupar os recursos de Calendario.
 */

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CalendarioController],
  providers: [CalendarioService],
})
export class CalendarioModule {}
