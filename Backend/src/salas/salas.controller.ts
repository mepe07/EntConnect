import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';
/**
 * Controlador responsavel pelos pedidos de Salas.
 */

@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}
  /**
   * Cria um novo registo.
   * @param createSalaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post()
  create(@Body() createSalaDto: CreateSalaDto) {
    return this.salasService.create(createSalaDto);
  }
  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  @Get()
  findAll() {
    return this.salasService.findAll();
  }
  /**
   * Obtem um registo pelo identificador.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salasService.findOne(+id);
  }
  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateSalaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalaDto: UpdateSalaDto) {
    return this.salasService.update(+id, updateSalaDto);
  }
  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salasService.remove(+id);
  }
}
