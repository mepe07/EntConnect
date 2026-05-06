import { Module } from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { FaturacaoController } from './faturacao.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
/**
 * Modulo responsavel por agrupar os recursos de Faturacao.
 */

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FaturacaoController],
  providers: [FaturacaoService],
})
export class FaturacaoModule {}
