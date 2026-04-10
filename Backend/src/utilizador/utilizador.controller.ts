import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto';
import { ProfessorService } from './professor/professor.service';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateProfessorDto } from './dto/update-professor.dto';

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

    // CONTROLER PARA GERIR PROFESSORES, EX: CRIAR UM PROFESSOR

  @ApiTags('Professores')
  @Controller('professor')
  export class ProfessorController {
  
  constructor(private readonly professorService: ProfessorService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo professor (e a respetiva pessoa)' })
  @ApiResponse({ status: 201, description: 'Professor criado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Conflito: NIF ou Email já existem.' })
  create(@Body() createProfessorDto: CreateProfessorDto) {
    return this.professorService.create(createProfessorDto);
  }

  // ENDPOINT PARA LISTAR (GET)
  @Get()
  @ApiOperation({ summary: 'Listar todos os professores com os seus dados pessoais' })
  findAll() {
    return this.professorService.findAll();
  }

  // ENDPOINT PARA EDITAR (PATCH)
  @Patch(':id')
  @ApiOperation({ summary: 'Editar os dados de um professor existente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProfessorDto: UpdateProfessorDto
  ) {
    return this.professorService.update(id, updateProfessorDto);
  }

  // ENDPOINT PARA REMOVER (DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Remover um professor (e os seus dados pessoais)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.professorService.remove(id);
  }
}

