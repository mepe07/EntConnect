import { Body, Controller, Delete, Get, ParseIntPipe, Patch, Post, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { ModalidadeService } from './modalidade/modalidade.service';


@ApiTags('Modalidades')
@Controller('modalidade')
/**
 * Controller responsável pelos endpoints de gestão de modalidades.
 */
export class ModalidadeController {

  constructor(private readonly modalidadeService: ModalidadeService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as modalidades' })
  findAll() {
    return this.modalidadeService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Adicionar uma nova modalidade à base de dados' })
  @ApiResponse({ status: 201, description: 'A modalidade foi criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() createModalidadeDto: CreateModalidadeDto) {
    return this.modalidadeService.create(createModalidadeDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar uma modalidade existente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModalidadeDto: UpdateModalidadeDto
  ) {
    return this.modalidadeService.update(id, updateModalidadeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma modalidade' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.modalidadeService.remove(id);
  }
}
