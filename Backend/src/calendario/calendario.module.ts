import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CalendarioController],
  providers: [CalendarioService],
})
/**
 * Módulo responsável pela agregação de dados do calendário.
 */
export class CalendarioModule {}
