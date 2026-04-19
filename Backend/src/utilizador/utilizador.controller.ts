import { 
  Controller, Get, Post, Put, Body, Patch, Param, Delete, 
  UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator
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
import { MarcacoesService } from './EE/marcacoes.service';

// Tipagem do Multer (Se não tiver o @types/multer instalado, mas ajuda o TS)
import 'multer';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Utilizadores')
@Controller('utilizador')
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService,
    private readonly dispobilidadeService: DispobilidadeService,
    private readonly marcacoesService: MarcacoesService,
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

  @Get(':id/EE/marcacoes')
  @ApiOperation({summary: 'Obter marcações por EE'})
  @ApiResponse({status:200})
  async getMarcacoesbyEE(@Param('id') id: string) {
    return this.marcacoesService.getMarcacoesbyEE(+id);
  }

  /**
   * FLUXO DIRETO: Importa um lote de utilizadores a partir de um ficheiro CSV local.
   * 1. Recebe o ficheiro via Multipart Form Data.
   * 2. Faz upload temporário para o Azure Blob Storage ('importar-csv').
   * 3. O sistema lê o ficheiro, cria as Pessoas e os Utilizadores.
   * 4. O ficheiro é imediatamente apagado do Azure para não acumular lixo.
   * @param file - O ficheiro CSV capturado pelo interceptor.
   */
  @Post('importusersblob')
  @UseInterceptors(FileInterceptor('file')) // Dizemos ao Nest para capturar o ficheiro
  @ApiConsumes('multipart/form-data') // Atualizamos o Swagger para mostrar o botão de upload
  @ApiOperation({ summary: 'Upload direto, importação e limpeza do Azure num só passo' })
  @ApiBody({
    description: 'Ficheiro CSV com os dados dos utilizadores a importar',
    schema: {
      type: 'object',
      properties: { 
        file: { 
          type: 'string', 
          format: 'binary' 
        } 
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Os utilizadores foram importados e o ficheiro temporário foi apagado do Azure.' })
  @ApiResponse({ status: 400, description: 'Ficheiro não especificado ou formato inválido.' })
  @ApiResponse({ status: 500, description: 'Erro interno ao processar a importação.' })
  async importarDoBlob(@UploadedFile() file: Express.Multer.File) {
    
    // Tratamento de Erro: Verifica se o utilizador anexou mesmo um ficheiro
    if (!file) {
      throw new BadRequestException('Por favor, selecione um ficheiro CSV para importar.');
    }

    // Guardamos os nomes para o Azure
    const nomeFicheiroCompleto = file.originalname;
    const nomeSemExtensao = nomeFicheiroCompleto.split('.').slice(0, -1).join('.');

    try {
      // PASSO 1: Enviar para o Azure
      await this.blobsService.uploadFicheiro('importar-csv', file, nomeSemExtensao || 'import_temp');

      // PASSO 2: O teu serviço lê o ficheiro do Azure e processa tudo na Base de Dados
      const resultadoImportacao = await this.importService.importarDeBlob(nomeFicheiroCompleto);

      // PASSO 3: Limpeza imediata! Apagar do Azure.
      await this.blobsService.apagarFicheiro('importar-csv', nomeFicheiroCompleto);

      // Devolvemos a mensagem de sucesso (que o teu serviço já cria tão bem)
      return resultadoImportacao;

    } catch (error) {
      // SEGURANÇA: Se a importação rebentar a meio (ex: CSV mal formatado), 
      // tentamos apagar o ficheiro à mesma para ele não ficar lá perdido!
      await this.blobsService.apagarFicheiro('importar-csv', file.originalname);
      
      throw error; // Re-lança o erro para aparecer no Frontend
    }
  }

  
  /**
   * Faz o upload físico de uma foto para o Azure e atualiza o URL na Base de Dados.
   * 1. Recebe o ficheiro via Multipart Form Data.
   * 2. Envia para o Azure Blob Storage.
   * 3. Guarda o URL gerado na tabela Pessoa (ligada ao ID_Utilizador).
   * @param id ID do utilizador (ID_Utilizador)
   * @param file Ficheiro de imagem capturado pelo interceptor
   */
  @Put(':id/uploadphoto')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Faz upload de uma foto para o Azure e guarda o URL na BD' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async UploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File, // 👈 Tiramos o ParseFilePipe daqui
  ) {
    // 1. Verifica se o ficheiro foi anexado
    if (!file) {
      throw new BadRequestException('Por favor, selecione uma foto.');
    }

    // 2. Validação do Tipo de Ficheiro (incluindo o teu jfif)
    const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;
    
    if (!extensoesPermitidas.test(file.mimetype)) {
      throw new BadRequestException(
        `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`
      );
    }

    // 3. Validação do Tamanho (com cálculo em MB)
    const limiteMB = 10;
    const limiteBytes = limiteMB * 1024 * 1024;

    if (file.size > limiteBytes) {
      // Converte o tamanho do ficheiro de Bytes para MB (com 2 casas decimais)
      const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);
      
      throw new BadRequestException(
        `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif.`
      );
    }

    // 4. Se passou nas validações, faz o upload!
    const nomeParaAzure = `user${id}`;

    const urlGerado = await this.blobsService.uploadFicheiro(
      'fotos-pessoas', 
      file, 
      nomeParaAzure
    );

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
  
  
 /**
   * Retorna a lista de aulas/ensaios de um utilizador.
   * A lógica no serviço deteta automaticamente se é Professor ou Aluno.
   * @param id ID do Utilizador logado
   */
  @Get(':id/aulas')
  @ApiOperation({ summary: 'Obter o horário de aulas/ensaios (Professor ou Aluno)' })
  @ApiResponse({ status: 200, description: 'Lista de aulas devolvida com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async getMinhasAulas(@Param('id') id: string) {
    return this.utilizadorService.getMinhasAulas(+id);
  }
    


  @Get('enc-educacao/:id/alunos')
  @ApiOperation({summary: 'Obter alunos de um Encarregado de Educação'})
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educação' })
  async getAlunosByEE(@Param('id') id: string) {
    return this.utilizadorService.getAlunosByEE(+id);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Atualizar a password de um utilizador' })
  @ApiParam({ name: 'id', description: 'ID do utilizador', type: Number })
  @ApiResponse({ status: 200, description: 'Password atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.utilizadorService.updatePassword(id, updatePasswordDto.password);
    return { message: `Password do utilizador ${id} atualizada com sucesso.` };
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

