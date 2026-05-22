import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/create-sala.dto';
import { UpdateSalaDto } from './dto/update-sala.dto';
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
 * Controlador responsavel pelos pedidos de Salas.
 */
@UseGuards(AuthGuard, RolesGuard)
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}
  /**
   * Cria um novo registo.
   * @param createSalaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */
  
  @Roles(Role.COORDENADOR)
  @Post()
  create(@Body() createSalaDto: CreateSalaDto) {
    return this.salasService.create(createSalaDto);
  }
  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES)
  @Get()
  findAll() {
    return this.salasService.findAll();
  }
  /**
   * Obtem um registo pelo identificador.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */
  
  @Roles(...TODAS_AS_ROLES)
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
  @Roles(Role.COORDENADOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalaDto: UpdateSalaDto) {
    return this.salasService.update(+id, updateSalaDto);
  }
  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salasService.remove(+id);
  }
}
