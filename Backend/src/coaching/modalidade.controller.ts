import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Patch,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { ModalidadeService } from './modalidade/modalidade.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';

const TODAS_AS_ROLES = [
    Role.COORDENADOR,
    Role.PROFESSOR,
    Role.ENC_EDUCACAO,
];
/**
 * Controlador responsavel pelos pedidos de Modalidade.
 */

@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Modalidades')
@UseGuards(AuthGuard, RolesGuard)
@Controller('modalidade')
export class ModalidadeController {
  constructor(private readonly modalidadeService: ModalidadeService) {}
  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */
  
  @Roles(...TODAS_AS_ROLES)
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

  @Roles(Role.COORDENADOR)
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

  @Roles(Role.COORDENADOR)
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

  @Roles(Role.COORDENADOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma modalidade' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.modalidadeService.remove(id);
  }
}
