import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(private readonly utilizadorService: UtilizadorService) {}

  @Get('utilizadores')
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


  // @Post()
  // create(@Body() createUtilizadorDto: CreateUtilizadorDto) {
  //   return this.utilizadorService.create(createUtilizadorDto);
  // }

  // @Get()
  // findAll() {
  //   return this.utilizadorService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.utilizadorService.findOne(+id);
  // }

 

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.utilizadorService.remove(+id);
  // }
}
