import { 
  Controller, Get, Post, Put, Body, Patch, Param, Delete, ForbiddenException,
  UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,Query, Res, UseGuards, Request, HttpStatus
} from '@nestjs/common'; 
import { FileInterceptor } from '@nestjs/platform-express';

// Swagger
import {
  ApiOperation, ApiTags, ApiResponse, ApiParam, ApiConsumes, ApiBody
} from '@nestjs/swagger';
// Serviços
import { UtilizadorService } from './utilizador.service';
import { DispobilidadeService } from './professor/Disponibilidade.service';
import { UtilizadorImportService } from './ImportUsers/utilizador-import.service';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { ProfessorService } from './professor/professor.service';
import { AgendamentosService } from './professor/Agendamentos.service'
import type { Response } from 'express';

// DTOs
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateProfessorDto } from './dto/update-professor.dto';
import { UpdatePessoalDto } from './dto/update-pessoal.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
// Tipagem do Multer
import { MarcacoesService } from './EE/marcacoes.service';

// Tipagem do Multer (Se não tiver o @types/multer instalado, mas ajuda o TS)
import 'multer';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpsertEducandoDto } from './dto/upsert-educando.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';

@ApiTags('Utilizadores')
@Controller('utilizador')
/**
 * Controller dos endpoints de gestão de utilizadores, fotografias e educandos.
 */
export class UtilizadorController {
  constructor(
    private readonly utilizadorService: UtilizadorService,
    private readonly importService: UtilizadorImportService,
    private readonly dispobilidadeService: DispobilidadeService,
    private readonly marcacoesService: MarcacoesService,
    private readonly blobsService: BlobsService,
    private readonly agendamentosService: AgendamentosService
  ) { }

  @Get()
  @ApiOperation({ summary: 'Listar todos os utilizadores' })
  @ApiResponse({ status: 200 })
  async getAllUsers() {
    return this.utilizadorService.getAllUsers();
  }

  @Get('alunos/sem-encarregado')
  @ApiOperation({ summary: 'Listar alunos sem encarregado de educacao associado' })
  @ApiResponse({ status: 200 })
  async getAlunosSemEncarregado() {
    return this.utilizadorService.getAlunosSemEncarregado();
  }

  @Get('enc-educacao/me/alunos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ENC_EDUCACAO)
  @ApiOperation({ summary: 'Listar os educandos do encarregado autenticado' })
  async getMeusEducandos(@Request() req: { user: UtilizadorAutenticado }) {
    return this.utilizadorService.getAlunosByEE(req.user.idPessoa);
  }

  @Post('enc-educacao/me/alunos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ENC_EDUCACAO)
  @ApiOperation({ summary: 'Adicionar educando ao encarregado autenticado (bloqueado)' })
  async criarMeuEducando() {
    throw new ForbiddenException('A gestão de educandos deve ser feita pela coordenação ou direção.');
  }

  @Put('enc-educacao/me/alunos/:idAluno')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ENC_EDUCACAO)
  @ApiOperation({ summary: 'Editar educando do encarregado autenticado (bloqueado)' })
  async atualizarMeuEducando() {
    throw new ForbiddenException('A gestão de educandos deve ser feita pela coordenação ou direção.');
  }

  @Delete('enc-educacao/me/alunos/:idAluno')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ENC_EDUCACAO)
  @ApiOperation({ summary: 'Remover associacao de educando do encarregado autenticado (bloqueado)' })
  async removerMeuEducando() {
    throw new ForbiddenException('A gestão de educandos deve ser feita pela coordenação ou direção.');
  }

  @Get('download-template')
  @ApiOperation({ summary: 'Faz o download do ficheiro CSV modelo para importar utilizadores' })
  async downloadTemplate(@Res() res: Response) {
    try {
      const conteudoCsv = await this.blobsService.lerFicheiroTexto('templates', 'Alunos.csv');

      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="modelo_utilizadores.csv"',
      });

      res.send(conteudoCsv);
    } catch (error) {
      console.error('Erro ao fazer download do modelo:', error);
      res.status(500).send('Erro ao obter o ficheiro modelo.');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um utilizador pelo ID (inclui dados pessoais)' })
  @ApiResponse({ status: 200, description: 'Utilizador encontrado.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.utilizadorService.findOne(id);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquear um utilizador' })
  @ApiResponse({ status: 200 })
  async blockUser(@Param('id') id: string) {
    await this.utilizadorService.blockUser(+id);
    return { message: `Utilizador com ID ${id} bloqueado com sucesso.` };
  }

  @Patch(':id/unlock')
  @ApiOperation({ summary: 'Desbloquear um utilizador' })
  @ApiResponse({ status: 200 })
  async unlockUser(@Param('id') id: string) {
    await this.utilizadorService.unlockUser(+id);
    return { message: `Utilizador com ID ${id} desbloqueado com sucesso.` };
  }

  /**
   * 
   * @param idUtilizador  
   * @returns O id do role do utilizador em questão
   */
  @Get(':id/roles-ids')
  @ApiOperation({ summary: 'Obter os IDs de Professor, Enc. Educação e Coordenador de um utilizador' })
  @ApiResponse({ status: 200, description: 'IDs das roles retornados com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async getRolesIds(@Param('id', ParseIntPipe) id: number) {
    return this.utilizadorService.getRolesIds(id);
  }

  @Get(':id/EE/marcacoes')
  @ApiOperation({ summary: 'Obter marcações por EE' })
  @ApiResponse({ status: 200 })
  async getMarcacoesbyEE(@Param('id') id: string) {
    return this.marcacoesService.getMarcacoesbyEE(+id);
  }

  @Get(':id/EE/confirmacoes')
  @ApiOperation({ summary: 'Obter sessões passadas por EE para confirmação' })
  @ApiResponse({ status: 200, description: 'Sessões para confirmação retornadas com sucesso.' })
  async getConfirmacoesByEE(@Param('id') id: string) {
    return this.marcacoesService.getConfirmacoesByEE(+id);
  }

  @Patch(':id/EE/confirmacoes/:idCoaching')
  @ApiOperation({ summary: 'Confirmar realização ou não realização de uma sessão de coaching como EE' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idEstadoCoaching: { type: 'number', example: 13 },
      },
      required: ['idEstadoCoaching'],
    },
  })
  @ApiResponse({ status: 200, description: 'Estado do coaching atualizado com sucesso.' })
  async confirmarSessaoByEE(
    @Param('id') id: string,
    @Param('idCoaching', ParseIntPipe) idCoaching: number,
    @Body('idEstadoCoaching', ParseIntPipe) idEstadoCoaching: number,
  ) {
    return this.marcacoesService.confirmarSessaoByEE(+id, idCoaching, idEstadoCoaching);
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
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
    if (!file) {
      throw new BadRequestException('Por favor, selecione um ficheiro CSV para importar.');
    }

    const nomeFicheiroCompleto = file.originalname;
    const nomeSemExtensao = nomeFicheiroCompleto.split('.').slice(0, -1).join('.');

    try {
      await this.blobsService.uploadFicheiro('importar-csv', file, nomeSemExtensao || 'import_temp');
      const resultadoImportacao = await this.importService.importarDeBlob(nomeFicheiroCompleto);
      await this.blobsService.apagarFicheiro('importar-csv', nomeFicheiroCompleto);
      return resultadoImportacao;
    } catch (error) {
      await this.blobsService.apagarFicheiro('importar-csv', file.originalname);
      throw error;
    }
  }

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
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Por favor, selecione uma foto.');
    }

    const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;
    if (!extensoesPermitidas.test(file.mimetype)) {
      throw new BadRequestException(
        `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`
      );
    }

    const limiteMB = 10;
    const limiteBytes = limiteMB * 1024 * 1024;

    if (file.size > limiteBytes) {
      const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB.`
      );
    }

    const nomeParaAzure = `user${id}`;
    const urlGerado = await this.blobsService.uploadFicheiro(
      'fotos-pessoas',
      file,
      nomeParaAzure
    );

    return this.utilizadorService.UploadPhoto(urlGerado, +id);
  }

  @Get(':id/foto')
  @ApiOperation({ summary: 'Obter o URL da foto de perfil do utilizador' })
  @ApiResponse({ status: 200, description: 'URL retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async getFotoPerfil(@Param('id') id: string) {
    return this.utilizadorService.getFotoPerfil(+id);
  }

  @Patch(':id/removephoto')
  @ApiOperation({ summary: 'Remover a foto de perfil do utilizador (coloca a null)' })
  @ApiResponse({ status: 200, description: 'A foto de perfil foi removida com sucesso.' })
  @ApiResponse({ status: 404, description: 'O utilizador com o ID fornecido não foi encontrado.' })
  async RemovePhoto(@Param('id') id: string) {
    await this.utilizadorService.RemovePhoto(+id);
    return { message: `A foto do utilizador com ID ${id} foi removida com sucesso.` };
  }

  @Post()
  @ApiOperation({ summary: 'Criar um novo utilizador manualmente' })
  @ApiResponse({ status: 201, description: 'Utilizador criado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Username ou email já existem.' })
  async createUser(@Body() createUtilizadorDto: CreateUtilizadorDto) {
    return this.utilizadorService.createUser(createUtilizadorDto);
  }

  @Get(':id/coachings')
  @ApiOperation({ summary: 'Obter o horário das sessões de coaching (Coach ou Bailarino)' })
  @ApiResponse({ status: 200, description: 'Lista de coachings devolvida com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async getMeusCoachings(@Param('id') id: string) {
    return this.utilizadorService.getMeusCoachings(+id);
  }
  
  // NOVO ENDPOINT DE ATUALIZAÇÃO PESSOAL COM DTO E SWAGGER
  @Put(':id/update-cargo')
  @ApiOperation({ summary: 'Atualizar o cargo do utilizador' })
  @ApiParam({ name: 'id', description: 'ID do Utilizador', example: 1 })
  @ApiResponse({ status: 200, description: 'Cargo atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado ou cargo inválido.' })
  async updateCargo(
    @Param('id', ParseIntPipe) id: number,
    @Body('cargo') cargo: string,
    @Body('confirmarRemocaoAssociacoes') confirmarRemocaoAssociacoes?: boolean,
  ) {
    return this.utilizadorService.updateCargo(id, cargo, confirmarRemocaoAssociacoes === true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar um utilizador e todos os seus dados' })
  @ApiParam({ name: 'id', description: 'ID do Utilizador', example: 1 })
  @ApiResponse({ status: 200, description: 'Utilizador eliminado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.utilizadorService.deleteUser(id);
  }

  @Put(':id/update-pessoal')
  @ApiOperation({
    summary: 'Atualizar dados pessoais (Nome, NIF e Contacto)',
    description: 'Permite que o utilizador altere o seu Nome, NIF e Contacto Telefónico na tabela Pessoa.'
  })
  @ApiParam({ name: 'id', description: 'ID do Utilizador', example: 1 })
  @ApiBody({ type: UpdatePessoalDto })
  @ApiResponse({ status: 200, description: 'Dados atualizados com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador ou Pessoa associada não encontrados.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  async updatePessoal(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePessoalDto,
  ) {
    // O controller continua a passar o pacote inteiro, que agora já inclui o 'nome'
    return this.utilizadorService.updateDadosPessoais(id, updateDto);
  }

  @Put(':id/change-password')
  @ApiOperation({ summary: 'Alterar a password do utilizador' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.utilizadorService.mudarPassword(id, dto);
  }

  @Get('encarregado/:id')
  @ApiOperation({ 
    summary: 'Obter histórico de faturação de um Encarregado de Educação',
    description: 'Devolve todas as faturas (pagas e em dívida) associadas aos educandos de um determinado utilizador (Encarregado de Educação). O ID fornecido deve ser o ID_Utilizador da conta.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do Utilizador (Conta) do Encarregado de Educação',
    type: 'number',
    example: 3
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de faturas devolvida com sucesso.',
    schema: {
      example: [
        {
          Data: '2026-05-02T11:00:00.000Z',
          Descricao: 'Aula Extra Preparação',
          Valor: 25.00,
          Pago: false,
          estado: 'Em Dívida'
        }
      ]
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Utilizador não encontrado no sistema.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Não tem permissão para aceder a estes dados.' 
  })
  async getFaturas(@Param('id', ParseIntPipe) id: number) {
    return this.utilizadorService.getFaturasEncarregado(id); 
  }

  @Get('enc-educacao/:id/alunos')
  @ApiOperation({ summary: 'Obter alunos de um Encarregado de Educação' })
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educação' })
  async getAlunosByEE(@Param('id') id: string) {
    return this.utilizadorService.getAlunosByEE(+id);
  }

  @Post('enc-educacao/:id/alunos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @ApiOperation({ summary: 'Adicionar um educando a um Encarregado de Educacao' })
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educacao' })
  async criarEducando(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertEducandoDto,
  ) {
    return this.utilizadorService.criarEducando(id, dto);
  }

  @Put('enc-educacao/:id/alunos/:idAluno')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @ApiOperation({ summary: 'Editar um educando de um Encarregado de Educacao' })
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educacao' })
  @ApiParam({ name: 'idAluno', description: 'ID do aluno' })
  async atualizarEducando(
    @Param('id', ParseIntPipe) id: number,
    @Param('idAluno', ParseIntPipe) idAluno: number,
    @Body() dto: UpsertEducandoDto,
  ) {
    return this.utilizadorService.atualizarEducando(id, idAluno, dto);
  }

  @Patch('enc-educacao/:id/alunos/:idAluno/associar')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @ApiOperation({ summary: 'Associar um aluno sem encarregado a um Encarregado de Educacao' })
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educacao' })
  @ApiParam({ name: 'idAluno', description: 'ID do aluno' })
  async associarEducando(
    @Param('id', ParseIntPipe) id: number,
    @Param('idAluno', ParseIntPipe) idAluno: number,
  ) {
    return this.utilizadorService.associarEducando(id, idAluno);
  }

  @Delete('enc-educacao/:id/alunos/:idAluno')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @ApiOperation({ summary: 'Remover a associacao de um educando a um Encarregado de Educacao' })
  @ApiParam({ name: 'id', description: 'ID do Encarregado de Educacao' })
  @ApiParam({ name: 'idAluno', description: 'ID do aluno' })
  async removerEducando(
    @Param('id', ParseIntPipe) id: number,
    @Param('idAluno', ParseIntPipe) idAluno: number,
  ) {
    return this.utilizadorService.removerEducando(id, idAluno);
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

  @Put(':id/preferencias-acoes')
  @ApiOperation({ 
    summary: 'Atualizar as preferências de ações rápidas do utilizador',
    description: 'Guarda um array de IDs das ações que o utilizador escolheu ver na Dashboard.' 
  })
  @ApiParam({ name: 'id', description: 'ID do Utilizador', example: 1 })
  @ApiBody({ 
    description: 'Array de IDs das ações rápidas (ex: [1, 3, 6])',
    schema: {
      type: 'array',
      items: { type: 'number' },
      example: [1, 3, 6]
    }
  })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas com sucesso.' })
  @ApiResponse({ status: 404, description: 'Utilizador não encontrado.' })
  async updatePreferenciasAcoes(
    @Param('id', ParseIntPipe) id: number,
    @Body() acoesIds: number[],
  ) {
    // Validação simples para garantir que recebemos um array
    if (!Array.isArray(acoesIds)) {
      throw new BadRequestException('O corpo da requisição deve ser um array de números.');
    }

    return this.utilizadorService.updatePreferenciasAcoes(id, acoesIds);
  }

  /**
   * 
   * @param idProfessor 
   * @returns Os agendamentos futuros do professor
   */
  @Get('professor/:id/agendamentos')
  @ApiOperation({ summary: 'Obter os agendamentos de um professor' })
  @ApiResponse({ status: 200 })
  async getAgendamentosProfessor(
    @Param('id') idProfessor: string
  ) {
    return this.agendamentosService.getAgendamentosProfessor(+idProfessor);
  }

  @Get('professor/:id/confirmacoes')
  @ApiOperation({ summary: 'Obter as sessões passadas do professor para confirmação' })
  @ApiResponse({ status: 200, description: 'Sessões a confirmar retornadas com sucesso.' })
  async getConfirmacoesProfessor(
    @Param('id') idProfessor: string
  ) {
    return this.agendamentosService.getConfirmacoesProfessor(+idProfessor);
  }

  @Patch('professor/:id/confirmacoes/:idCoaching')
  @ApiOperation({ summary: 'Confirmar realização ou não realização de uma sessão de coaching' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idEstadoCoaching: { type: 'number', example: 13 },
      },
      required: ['idEstadoCoaching'],
    },
  })
  @ApiResponse({ status: 200, description: 'Estado do coaching atualizado com sucesso.' })
  async confirmarSessaoProfessor(
    @Param('id') idProfessor: string,
    @Param('idCoaching', ParseIntPipe) idCoaching: number,
    @Body('idEstadoCoaching', ParseIntPipe) idEstadoCoaching: number,
  ) {
    return this.agendamentosService.atualizarConfirmacaoProfessor(+idProfessor, idCoaching, idEstadoCoaching);
  }

  /**
   * Obtém a lista de disponibilidades dos professores.
   * @returns A lista de disponibilidades dos professores.
   */
  @Get('professor/disponibilidade')
  @ApiOperation({ summary: 'Obter disponibilidades dos professores' })
  @ApiResponse({ status: 200 })
  async getDisponibilidades() {
    return this.dispobilidadeService.getAvailabilities();
  }

  @Post('professor/adicionar-disponibilidade')
  @ApiOperation({ summary: 'Adicionar nova disponibilidade de calendário para o professor' })
  @ApiResponse({ status: 201, description: 'Disponibilidade criada com sucesso.' })
  async adicionarDisponibilidade(@Body() dto: CreateDisponibilidadeDto) {
    return this.dispobilidadeService.criarDisponibilidade(dto);
  }

  @Patch('professor/disponibilidade/:id/atualizar-disponibilidade')
  @ApiOperation({ summary: 'Atualizar disponibilidade - Ex: aprovar' })
  @ApiParam({ name: 'id', description: 'Identificador único (ID) da Disponibilidade', example: 1, type: Number })
  @ApiResponse({ status: 200 })
  async updateDisponibility(
    @Param('id') idDisponibilidade: string,
    @Body() updateDisponibilidadeDto: UpdateDisponibilidadeDto
  ) {
    return this.dispobilidadeService.updateAvailability(+idDisponibilidade, updateDisponibilidadeDto);
  }
} // <-- Fim do UtilizadorController


// ============================================================================
// CONTROLADOR DE PROFESSORES
// ============================================================================
@ApiTags('Professores')
@Controller('professor')
export class ProfessorController {

  constructor(private readonly professorService: ProfessorService) { }

  @Post()
  @ApiOperation({ summary: 'Criar um novo professor (e a respetiva pessoa)' })
  @ApiResponse({ status: 201, description: 'Professor criado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Conflito: NIF ou Email já existem.' })
  create(@Body() createProfessorDto: CreateProfessorDto) {
    return this.professorService.create(createProfessorDto);
  }

  // ENDPOINT PARA LISTAR COM PAGINAÇÃO
  @Get()
  @ApiOperation({ summary: 'Listar professores com paginação (20 por página)' })
  findAll(@Query('page') page: string) {
    // Se não enviar página, assume a 1. O "+" converte string para número.
    const paginaAtual = page ? +page : 1;
    return this.professorService.findAll(paginaAtual);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar os dados de um professor existente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProfessorDto: UpdateProfessorDto
  ) {
    return this.professorService.update(id, updateProfessorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um professor (e os seus dados pessoais)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.professorService.remove(id);
  }
}
