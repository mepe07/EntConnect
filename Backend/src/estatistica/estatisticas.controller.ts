import { Controller, Get, Param, Query } from '@nestjs/common';
import { EstatisticasService } from './estatisticas.service';
import { ApiTags } from '@nestjs/swagger';
/**
 * Controlador responsavel pelos pedidos de Estatisticas.
 */

@ApiTags('Estatisticas')
@Controller('estatisticas')
export class EstatisticasController {
  constructor(private readonly estatisticasService: EstatisticasService) {}
  /**
   * Executa a operacao get alunos.
   * @returns Resultado da operacao.
   */

  @Get('alunos')
  async getAlunos() {
    return this.estatisticasService.getAlunos();
  }
  /**
   * Executa a operacao get aulas hoje.
   * @returns Resultado da operacao.
   */

  @Get('aulas-hoje')
  async getAulasHoje() {
    return this.estatisticasService.getAulasHoje();
  }
  /**
   * Executa a operacao get dashboard encarregado.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('encarregado/:id/dashboard')
  async getDashboardEncarregado(@Param('id') id: string) {
    return this.estatisticasService.getDashboardEncarregado(+id);
  }
  /**
   * Executa a operacao get dashboard professor.
   * @param id Dados recebidos para a operacao.
   * @param inicio Dados recebidos para a operacao.
   * @param fim Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('professor/:id/dashboard')
  async getDashboardProfessor(
    @Param('id') id: string,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.estatisticasService.getDashboardProfessor(+id, inicio, fim);
  }
}
