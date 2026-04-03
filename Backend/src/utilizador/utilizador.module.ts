import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';
import { DispobilidadeService } from './professor/Disponibilidade.service';

@Module({
  controllers: [UtilizadorController],
  providers: [UtilizadorService, DispobilidadeService],
})
export class UtilizadorModule {}
