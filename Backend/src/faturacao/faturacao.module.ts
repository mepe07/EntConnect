import { Module } from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { FaturacaoController } from './faturacao.controller';

@Module({
  controllers: [FaturacaoController],
  providers: [FaturacaoService],
})
export class FaturacaoModule {}
