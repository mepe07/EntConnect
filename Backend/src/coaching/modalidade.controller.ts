import { Body, Controller, Delete, Get, ParseIntPipe, Patch, Post, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { ModalidadeService } from './modalidade/modalidade.service';


@ApiTags('Modalidades') // Cria a secção "Modalidades" no Swagger
@Controller('modalidade') // O URL vai ser http://localhost:3000/modalidade
export class ModalidadeController {
  
  // Injeta o teu serviço para podermos comunicar com a BD
  constructor(private readonly modalidadeService: ModalidadeService) {}

  // ENDPOINT PARA LISTAR (GET)
  @Get()
  @ApiOperation({ summary: 'Listar todas as modalidades' })
  findAll() {
    return this.modalidadeService.findAll();
  }

  @Post() // Indica que é um pedido para CRIAR (POST)
  @ApiOperation({ summary: 'Adicionar uma nova modalidade à base de dados' })
  @ApiResponse({ status: 201, description: 'A modalidade foi criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() createModalidadeDto: CreateModalidadeDto) {
    // O @Body() apanha o JSON do Swagger e passa-o para o teu Service gravar na BD
    return this.modalidadeService.create(createModalidadeDto);
  }
  
  // ENDPOINT PARA EDITAR (PATCH)
  @Patch(':id') // O ':id' significa que espera um número no URL
  @ApiOperation({ summary: 'Editar uma modalidade existente' })
  update(
    @Param('id', ParseIntPipe) id: number, // Apanha o ID do URL e converte para número
    @Body() updateModalidadeDto: UpdateModalidadeDto // Apanha o JSON do Body
  ) {
    return this.modalidadeService.update(id, updateModalidadeDto);
  }

  // ENDPOINT PARA REMOVER (DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma modalidade' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.modalidadeService.remove(id);
  }
 
}
