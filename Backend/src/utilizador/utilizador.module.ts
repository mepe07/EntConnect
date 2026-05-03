import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { ProfessorController } from './utilizador.controller'; 
import { ProfessorService } from './professor/professor.service';       
import { MarcacoesService } from './EE/marcacoes.service';
import { AgendamentosService } from './professor/Agendamentos.service';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [AuthModule],
  controllers: [UtilizadorController, ProfessorController],
  providers: [
    UtilizadorService, 
    UtilizadorImportService,
    DispobilidadeService, 
    ProfessorService,
    MarcacoesService,
    AgendamentosService,
    PrismaService],
})
/**
 * Módulo responsável pela gestão de utilizadores, professores e educandos.
 */
export class UtilizadorModule {}
