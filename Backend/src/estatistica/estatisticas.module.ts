import { Module } from '@nestjs/common';
import { EstatisticasController } from './estatisticas.controller';
import { EstatisticasService } from './estatisticas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
/**
 * Modulo responsavel por agrupar os recursos de Estatisticas.
 */

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EstatisticasController],
  providers: [EstatisticasService],
})
export class EstatisticasModule {}
