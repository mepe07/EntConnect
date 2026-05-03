import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HorariosService } from './horarios.service';
import { CreateAulaFixaDto } from './dto/create-aula-fixa.dto';
import { CreateExcecaoAulaFixaDto } from './dto/create-excecao-aula-fixa.dto';
import { UpdateAulaFixaDto } from './dto/update-aula-fixa.dto';

@ApiTags('Horários')
@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  @Get('dias-semana')
  @ApiOperation({ summary: 'Obter os dias da semana para horários fixos' })
  async getDiasSemana() {
    return this.horariosService.getDiasSemana();
  }

  @Get()
  @ApiOperation({ summary: 'Listar horários fixos' })
  async findAll() {
    return this.horariosService.getAllHorarios();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter os detalhes de um horário fixo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.getHorarioById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar um novo horário fixo' })
  async create(@Body() createAulaFixaDto: CreateAulaFixaDto) {
    return this.horariosService.createHorario(createAulaFixaDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de um horário fixo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAulaFixaDto: UpdateAulaFixaDto,
  ) {
    return this.horariosService.updateHorario(id, updateAulaFixaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar um horário fixo' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.deleteHorario(id);
  }

  @Post(':id/excecoes')
  @ApiOperation({ summary: 'Criar exceção para um horário fixo' })
  async createExcecao(
    @Param('id', ParseIntPipe) id: number,
    @Body() createExcecaoAulaFixaDto: CreateExcecaoAulaFixaDto,
  ) {
    return this.horariosService.createExcecao(id, createExcecaoAulaFixaDto);
  }

  @Delete('excecoes/:idExcecao')
  @ApiOperation({ summary: 'Eliminar uma exceção (cancelamento) de um horário' })
  async removeExcecao(@Param('idExcecao', ParseIntPipe) idExcecao: number) {
    return this.horariosService.deleteExcecao(idExcecao);
  }
}
