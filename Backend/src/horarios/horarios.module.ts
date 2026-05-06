import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosController } from './horarios.controller';
import { HorariosService } from './horarios.service';
import { AuthModule } from '../auth/auth.module';
/**
 * Modulo responsavel por agrupar os recursos de Horarios.
 */

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HorariosController],
  providers: [HorariosService],
})
export class HorariosModule {}
