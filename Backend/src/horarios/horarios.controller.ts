import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HorariosService } from './horarios.service';
import { CreateAulaFixaDto } from './dto/create-aula-fixa.dto';
import { CreateExcecaoAulaFixaDto } from './dto/create-excecao-aula-fixa.dto';
import { UpdateAulaFixaDto } from './dto/update-aula-fixa.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/auth.guard';
/**
 * Controlador responsavel pelos pedidos de Horarios.
 */

@ApiTags('Horários')
@UseGuards(AuthGuard, RolesGuard)
@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}
  /**
   * Executa a operacao get dias semana.
   * @returns Resultado da operacao.
   */

  @Get('dias-semana')
  @ApiOperation({ summary: 'Obter os dias da semana para horários fixos' })
  async getDiasSemana() {
    return this.horariosService.getDiasSemana();
  }
  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  @Get()
  @ApiOperation({ summary: 'Listar horários fixos' })
  async findAll() {
    return this.horariosService.getAllHorarios();
  }
  /**
   * Obtem um registo pelo identificador.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get(':id')
  @ApiOperation({ summary: 'Obter os detalhes de um horário fixo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.getHorarioById(id);
  }
  /**
   * Cria um novo registo.
   * @param createAulaFixaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post()
  @ApiOperation({ summary: 'Criar um novo horário fixo' })
  async create(@Body() createAulaFixaDto: CreateAulaFixaDto) {
    return this.horariosService.createHorario(createAulaFixaDto);
  }
  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateAulaFixaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de um horário fixo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAulaFixaDto: UpdateAulaFixaDto,
  ) {
    return this.horariosService.updateHorario(id, updateAulaFixaDto);
  }
  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar um horário fixo' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.deleteHorario(id);
  }
  /**
   * Executa a operacao create excecao.
   * @param id Dados recebidos para a operacao.
   * @param createExcecaoAulaFixaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post(':id/excecoes')
  @ApiOperation({ summary: 'Criar exceção para um horário fixo' })
  async createExcecao(
    @Param('id', ParseIntPipe) id: number,
    @Body() createExcecaoAulaFixaDto: CreateExcecaoAulaFixaDto,
  ) {
    return this.horariosService.createExcecao(id, createExcecaoAulaFixaDto);
  }
  /**
   * Executa a operacao remove excecao.
   * @param idExcecao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Delete('excecoes/:idExcecao')
  @ApiOperation({
    summary: 'Eliminar uma exceção (cancelamento) de um horário',
  })
  async removeExcecao(@Param('idExcecao', ParseIntPipe) idExcecao: number) {
    return this.horariosService.deleteExcecao(idExcecao);
  }
}
