import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Patch,
  Post,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { ModalidadeService } from './modalidade/modalidade.service';
/**
 * Controlador responsavel pelos pedidos de Modalidade.
 */

@ApiTags('Modalidades')
@Controller('modalidade')
export class ModalidadeController {
  constructor(private readonly modalidadeService: ModalidadeService) {}
  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  @Get()
  @ApiOperation({ summary: 'Listar todas as modalidades' })
  findAll() {
    return this.modalidadeService.findAll();
  }
  /**
   * Cria um novo registo.
   * @param createModalidadeDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post()
  @ApiOperation({ summary: 'Adicionar uma nova modalidade à base de dados' })
  @ApiResponse({
    status: 201,
    description: 'A modalidade foi criada com sucesso.',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() createModalidadeDto: CreateModalidadeDto) {
    return this.modalidadeService.create(createModalidadeDto);
  }
  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateModalidadeDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch(':id')
  @ApiOperation({ summary: 'Editar uma modalidade existente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModalidadeDto: UpdateModalidadeDto,
  ) {
    return this.modalidadeService.update(id, updateModalidadeDto);
  }
  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma modalidade' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.modalidadeService.remove(id);
  }
}
