import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common'; //Adicionados UseInterceptors, UploadedFile para ImportarCSV
import { UtilizadorService } from './utilizador.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService // Injetado aqui ImportUsersService
  ) {}

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

@Post('importar')
  @ApiOperation({ summary: 'Importar utilizadores via CSV' })
  @ApiResponse({ status: 201, description: 'Os utilizadores foram importados e criados com sucesso.' })
  @ApiResponse({ status: 400, description: 'Ficheiro inválido ou não enviado (ex: falta o ficheiro CSV).' })
  @ApiResponse({ status: 500, description: 'Erro interno ao tentar processar ou gravar na base de dados.' })
  @UseInterceptors(FileInterceptor('ficheiro')) 
  async uploadFile(@UploadedFile() file: Express.Multer.File) {

    return this.importService.importarDeCSV(file);
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
