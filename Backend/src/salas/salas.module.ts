import { Module } from '@nestjs/common';
import { SalasService } from './salas.service';
import { SalasController } from './salas.controller';
/**
 * Modulo responsavel por agrupar os recursos de Salas.
 */

@Module({
  controllers: [SalasController],
  providers: [SalasService],
})
export class SalasModule {}
