import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService, 
    private readonly dispobilidadeService: DispobilidadeService) {}

  /**
   * Obtém a lista completa de todos os utilizadores registados no sistema.
   * A resposta inclui os dados de login combinados com os dados pessoais (Nome, Email, etc.)
   * e um array com os cargos que a pessoa desempenha (Professor, Aluno, etc.).
   * Os dados sensíveis, como as passwords, são automaticamente omitidos da resposta.
   *
   * @returns {Promise<any[]>} Um array de objetos formatados com a informação de cada utilizador.
   */
  @Get()
  @ApiOperation({summary: 'Listar todos os utilizadores'})
  @ApiResponse({status:200})
  async getAllUsers() {
    return this.utilizadorService.getAllUsers();
  }

  @Patch(':id/block')
  @ApiOperation({summary: 'Bloquear um utilizador'})
  @ApiResponse({status:200})
  async blockUser(@Param('id') id: string) {
    // +id é para converter a string do id para número, já que o serviço espera um número
    await this.utilizadorService.blockUser(+id);

    return {message: `Utilizador com ID ${id} bloqueado com sucesso.`};
  }

  @Patch(':id/unlock')
  @ApiOperation({summary: 'Desbloquear um utilizador'})
  @ApiResponse({status:200})
  async unlockUser(@Param('id') id: string) {
    // +id é para converter a string do id para número, já que o serviço espera um número
    await this.utilizadorService.unlockUser(+id);

    return {message: `Utilizador com ID ${id} desbloqueado com sucesso.`};
  }

  @Post('professor/:id/adicionar-disponibilidade')
  @ApiOperation({summary: 'Criar disponibilidade para um professor'})
  @ApiParam({ 
    name: 'id', 
    description: 'Identificador único (ID) do professor',
    example: 1,
    type: Number
  })
  @ApiResponse({status:201})
  async createDisponibility(
    @Param('id') id: string, 
    @Body() createDisponibilidadeDto: CreateDisponibilidadeDto) {
    return this.dispobilidadeService.createAvailability(+id, createDisponibilidadeDto);
  }

  @Patch('professor/disponibilidade/:id/atualizar-disponibilidade')
  @ApiOperation({summary: 'Atualizar disponibilidade - Ex: aprovar'})
  @ApiParam({ 
    name: 'id', 
    description: 'Identificador único (ID) da Disponibilidade a alterar',
    example: 1,
    type: Number
  })
  @ApiResponse({status:200})
  async updateDisponibility(
    @Param('id') idDisponibilidade: string,
    @Body() updateDisponibilidadeDto: UpdateDisponibilidadeDto) {
      return this.dispobilidadeService.updateAvailability(+idDisponibilidade, updateDisponibilidadeDto);
    } 





}
