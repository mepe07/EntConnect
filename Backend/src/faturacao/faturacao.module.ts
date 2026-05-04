import { Module } from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { FaturacaoController } from './faturacao.controller';
import { PrismaModule } from '../prisma/prisma.module';
/**
 * Modulo responsavel por agrupar os recursos de Faturacao.
 */

@Module({
  imports: [PrismaModule],
  controllers: [FaturacaoController],
  providers: [FaturacaoService],
})
export class FaturacaoModule {}
