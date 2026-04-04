import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';

@Module({
  controllers: [UtilizadorController],
  providers: [
    UtilizadorService, 
    UtilizadorImportService, 
    DispobilidadeService,
    PrismaService
  ],
})
export class UtilizadorModule {}