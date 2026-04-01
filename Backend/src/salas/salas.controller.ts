import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';

@Controller('salas')
export class SalasController {

    // Injetamos o serviço de Salas no construtor do controlador.
  constructor(private readonly salasService: SalasService) {}

    // ==========================================
    // RECEBER UM POST (Criar nova sala)
    // ==========================================
    @Post()
    create(@Body() createSalaDto: CreateSalaDto) {
        // O @Body() extrai os dados que vêm colados no pedido do React 
        // e atira-os para o Service processar.
        return this.salasService.create(createSalaDto);
    }

    // ==========================================
    // RECEBER UM GET (Devolver todas as salas)
    // ==========================================
    @Get()
    findAll() {
        return this.salasService.findAll();
    }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalaDto: UpdateSalaDto) {
    return this.salasService.update(+id, updateSalaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salasService.remove(+id);
  }
}
