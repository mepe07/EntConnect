import { Controller, Get, Post, Put, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common'; 
import { UtilizadorService } from './utilizador.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { ApiBody } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService,
    private readonly dispobilidadeService: DispobilidadeService
  ) {}

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

  /**
   * Importa um lote de utilizadores a partir de um ficheiro CSV.
   * * O ficheiro já deve ter sido previamente carregado para o Azure Blob Storage.
   * * O sistema irá ler o ficheiro linha a linha, criar a Pessoa e o respetivo Utilizador associado.
   * @param {string} nomeFicheiro - O nome exato do ficheiro CSV armazenado no Azure (ex: "Alunos.csv").
   * @returns Retorna um objeto contendo uma mensagem de sucesso e a lista dos registos importados.
   * @throws {BadRequestException} Se o nome do ficheiro não for enviado ou se o ficheiro não existir no Azure.
   */
  @Post('importusersblob')
  @ApiOperation({ summary: 'Importar utilizadores lendo um CSV do Azure Blob Storage' })
  @ApiBody({
    description: 'Nome do ficheiro CSV que já se encontra no Azure Blob Storage',
    schema: {
      type: 'object',
      properties: {
        nomeFicheiro: { 
          type: 'string', 
          example: 'Alunos.csv' 
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Os utilizadores foram importados do Azure e criados com sucesso.' })
  @ApiResponse({ status: 400, description: 'Ficheiro não especificado ou não encontrado no Azure.' })
  @ApiResponse({ status: 500, description: 'Erro interno ao comunicar com o Blob Storage ou gravar na base de dados.' })
  async importarDoBlob(@Body('nomeFicheiro') nomeFicheiro: string) {
    
    // Tratamento de Erro: Verifica se o utilizador se esqueceu de enviar o nome
    if (!nomeFicheiro || nomeFicheiro.trim() === '') {
      throw new BadRequestException('Por favor, envie o "nomeFicheiro" (formato JSON) no corpo do pedido.');
    }

    // Chama o serviço que vai ligar ao Azure e tratar os erros de ficheiro não encontrado
    return this.importService.importarDeBlob(nomeFicheiro);
  }

  /**
   * Atualiza a foto de perfil de um utilizador.
   * * Este endpoint recebe o URL de uma imagem previamente carregada para o Azure Blob Storage 
   * e associa esse URL ao perfil da Pessoa ligada ao ID do Utilizador fornecido.
   * * @param {string} UrlPhoto - O URL completo da imagem guardada no Azure Blob Storage (enviado no corpo do pedido).
   * @param {string} id - O ID do utilizador a atualizar (capturado a partir da rota da API).
   * @returns Retorna uma Promise com o registo da Pessoa atualizada na base de dados.
   */
  @Put(':id/uploadphoto')
  @ApiOperation({ summary: 'Adiciona um URL da foto de perfil do Utilizador na BD' })
  @ApiBody({
    description: 'URL da foto guardada no Azure',
    schema: {
      type: 'object',
      properties: {
        UrlPhoto: { 
          type: 'string', 
          example: 'https://aminhaconta.blob.core.windows.net/fotos/joao.png' 
        }
      }
    }
  })
  async UploadPhoto(@Body('UrlPhoto') UrlPhoto: string, @Param('id') id: string) {
    
    // O +id converte rapidamente a string recebida no parâmetro da rota para um número (Number)
    return this.utilizadorService.UploadPhoto(UrlPhoto, +id); 
  }

  /**
   * Remove a foto de perfil de um utilizador.
   * @param {string} id - O ID do utilizador a atualizar.
   * @returns Uma mensagem de sucesso.
   */
  @Patch(':id/removephoto')
  @ApiOperation({ summary: 'Remover a foto de perfil do utilizador (coloca a null)' })
  @ApiResponse({ status: 200, description: 'A foto de perfil foi removida com sucesso.' })
  @ApiResponse({ status: 404, description: 'O utilizador com o ID fornecido não foi encontrado.' })
  async RemovePhoto(@Param('id') id: string) {
    
    await this.utilizadorService.RemovePhoto(+id);
    
    // Como estamos apenas a apagar, devolver uma mensagem simples fica muito elegante no frontend
    return { message: `A foto do utilizador com ID ${id} foi removida com sucesso.` };
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
