// Ficheiro: estatisticas.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { EstatisticasService } from './estatisticas.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Estatisticas')
@Controller('estatisticas')
export class EstatisticasController {
  constructor(private readonly estatisticasService: EstatisticasService) {}

  @Get('alunos') 
  async getAlunos() { 
    return this.estatisticasService.getAlunos(); // Atualiza também o nome do método se quiseres
  }

  @Get('aulas-hoje')
  async getAulasHoje() {
    return this.estatisticasService.getAulasHoje();
  }

  @Get('encarregado/:id/dashboard')
  async getDashboardEncarregado(@Param('id') id: string) {
    // Chama a função do service que criaste acima
    return this.estatisticasService.getDashboardEncarregado(+id);
  }

  @Get('professor/:id/dashboard')
  async getDashboardProfessor(
    @Param('id') id: string,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string
  ) {
    // Passa o ID e as datas (que vêm no url ex: ?inicio=2026-05-01) para o service
    return this.estatisticasService.getDashboardProfessor(+id, inicio, fim);
  }

}