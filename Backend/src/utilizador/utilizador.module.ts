import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { ProfessorController } from './utilizador.controller'; 
import { ProfessorService } from './professor/professor.service';       
import { PrismaService } from '../prisma/prisma.service';


@Module({
  controllers: [UtilizadorController, ProfessorController],
  providers: [UtilizadorService, DispobilidadeService, ProfessorService, PrismaService],
})
export class UtilizadorModule {}
