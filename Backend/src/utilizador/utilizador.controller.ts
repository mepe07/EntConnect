import { 
  Controller, Get, Post, Put, Body, Patch, Param, Delete, 
  UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe
} from '@nestjs/common'; 
import { FileInterceptor } from '@nestjs/platform-express';

// Swagger
import { 
  ApiOperation, ApiTags, ApiResponse, ApiParam, ApiConsumes, ApiBody 
} from '@nestjs/swagger';

// Serviços e DTOs
import { UtilizadorService } from './utilizador.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service'; 

import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto';
import { ProfessorService } from './professor/professor.service';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateProfessorDto } from './dto/update-professor.dto';

// Tipagem do Multer (Se não tiver o @types/multer instalado, mas ajuda o TS)
import 'multer';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService,
    private readonly dispobilidadeService: DispobilidadeService,
    private readonly blobsService: BlobsService,
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
   * * O ficheiro já deve ter sido previamente carregado para o contentor 'importar-csv' no Azure Blob Storage.
   * * O sistema irá ler o ficheiro linha a linha, criar a Pessoa e o respetivo Utilizador associado.
   * @param {string} nomeFicheiro - O nome exato do ficheiro CSV armazenado no Azure (ex: "Alunos.csv").
   * @returns Retorna um objeto contendo uma mensagem de sucesso e a lista dos registos importados.
   * @throws {BadRequestException} Se o nome do ficheiro não for enviado ou se o ficheiro não existir no Azure.
   */
  @Post('importusersblob')
  @ApiOperation({ summary: 'Importar utilizadores lendo um CSV do contentor "importar-csv" no Azure' })
  @ApiBody({
    description: 'Nome do ficheiro CSV que já se encontra no Azure Blob Storage (Contentor: importar-csv)',
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

    // Retiramos o 'importar-csv' daqui, o serviço já sabe qual é o contentor
    return this.importService.importarDeBlob(nomeFicheiro);
  }

  
  /**
   * Faz o upload físico de uma foto para o Azure e atualiza o URL na Base de Dados.
   * 1. Recebe o ficheiro via Multipart Form Data.
   * 2. Envia para o Azure Blob Storage.
   * 3. Guarda o URL gerado na tabela Pessoa (ligada ao ID_Utilizador).
   * * @param id ID do utilizador (ID_Utilizador)
   * @param file Ficheiro de imagem capturado pelo interceptor
   */
  @Put(':id/uploadphoto')
  @UseInterceptors(FileInterceptor('file')) // 'file' é o nome do campo no Postman/Swagger
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Faz upload de uma foto para o Azure e guarda o URL na BD' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // Isto ativa o botão "Choose File" no Swagger
        },
      },
    },
  })
  async UploadPhoto(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Selecione uma foto.');
  }

  // Definimos o nome fixo: user + id do utilizador
  const nomeParaAzure = `user${id}`;

  // Enviamos para o serviço com o novo nome 
  const urlGerado = await this.blobsService.uploadFicheiro(
    'fotos-pessoas', //'fotos-pessoas' COMO PRIMEIRO ARGUMENTO (CONTAINER NAME)
    file, 
    nomeParaAzure
  );

  // Guardamos o link final na BD (Prisma)
  return this.utilizadorService.UploadPhoto(urlGerado, +id);
}


// src/utilizador/utilizador.controller.ts

  /**
   * Obtém o URL da foto de perfil de um utilizador.
   * * Vai à Base de Dados procurar o campo da foto associado à Pessoa.
   * @param {string} id - O ID do utilizador.
   * @returns Um objeto com o URL da foto para ser usado no frontend (ex: na tag <img src="...">).
   */
  @Get(':id/foto')
  @ApiOperation({ summary: 'Obter o URL da foto de perfil do utilizador' })
  @ApiResponse({ status: 200, description: 'URL retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async getFotoPerfil(@Param('id') id: string) {
    
    // Chama o serviço passando o ID convertido para número
    return this.utilizadorService.getFotoPerfil(+id);
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
 

  @Get('enc-educacao/:id/alunos')
  @ApiOperation({summary: 'Obter alunos de um Encarregado de Educação'})
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educação' })
  async getAlunosByEE(@Param('id') id: string) {
    return this.utilizadorService.getAlunosByEE(+id);
  }

  /**
   * Obtém a lista de disponibilidades dos professores.
   * @returns A lista de disponibilidades dos professores.
   */
  @Get('professor/disponibilidade')
  @ApiOperation({summary: 'Obter disponibilidades dos professores'})
  @ApiResponse({status:200})
  async getDisponibilidades() {
    return this.dispobilidadeService.getAvailabilities();
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

