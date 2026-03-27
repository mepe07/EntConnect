import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [UtilizadorController],
  providers: [
    UtilizadorService, 
    UtilizadorImportService, 
    PrismaService
  ],
})
export class UtilizadorModule {}