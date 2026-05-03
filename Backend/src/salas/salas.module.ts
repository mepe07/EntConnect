import { Module } from '@nestjs/common';
import { SalasService } from './salas.service';
import { SalasController } from './salas.controller';

@Module({
  controllers: [SalasController],
  providers: [SalasService],
})
/**
 * Módulo responsável pela gestão de salas.
 */
export class SalasModule {}
