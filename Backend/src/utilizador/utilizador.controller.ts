import { Controller, Get, Post, Body, Patch, Param, BadRequestException } from '@nestjs/common'; 
import { UtilizadorService } from './utilizador.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService
  ) {}

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
    await this.utilizadorService.blockUser(+id);
    return {message: `Utilizador com ID ${id} bloqueado com sucesso.`};
  }

  @Patch(':id/unlock')
  @ApiOperation({summary: 'Desbloquear um utilizador'})
  @ApiResponse({status:200})
  async unlockUser(@Param('id') id: string) {
    await this.utilizadorService.unlockUser(+id);
    return {message: `Utilizador com ID ${id} desbloqueado com sucesso.`};
  }

  @Post('importar-do-blob')
  @ApiOperation({ summary: 'Importar utilizadores lendo um CSV do Azure Blob Storage' })
  @ApiResponse({ status: 201, description: 'Os utilizadores foram importados do Azure e criados com sucesso.' })
  @ApiResponse({ status: 400, description: 'Ficheiro não especificado ou não encontrado no Azure.' })
  @ApiResponse({ status: 500, description: 'Erro interno ao comunicar com o Blob Storage ou gravar na base de dados.' })
  async importarDoBlob(@Body('nomeFicheiro') nomeFicheiro: string) {
    
    //Tratamento de Erro: Verifica se o utilizador se esqueceu de enviar o nome
    if (!nomeFicheiro || nomeFicheiro.trim() === '') {
      throw new BadRequestException('Por favor, envie o "nomeFicheiro" (formato JSON) no corpo do pedido.');
    }

    //Chama o serviço que vai ligar ao Azure e tratar os erros de ficheiro não encontrado
    return this.importService.importarDeBlob(nomeFicheiro);
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