//#region  imports
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UnauthorizedException,Headers } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import path from 'path';
import { GestaoEstudiosService } from './estudios/gestaoEstudios.service';
import { get } from 'http';
import { ModalidadeService } from './modalidade/modalidade.service';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { InscreverAlunoDto } from './dto/inscrever-aluno.dto';
//#endregion

@ApiTags('Coaching') // Tag para agrupar os endpoints relacionados a Coaching no Swagger
@Controller('coaching')
export class CoachingController {
  constructor(
    private readonly coachingService: CoachingService,
    private readonly gestaoEstudiosService: GestaoEstudiosService,
    private readonly modalidadesService: ModalidadeService
    
  ) {}


  /**
   * Recebe o pedido HTTP para criar uma nova sessão de coaching.
   * Os dados de entrada são automaticamente validados pelas regras definidas no CreateCoachingDto
   * antes de serem passados para a camada de serviço (Service) para inserção na Base de Dados.
   * * @param createCoachingDto Objeto JSON contendo os dados da nova sessão (Duração, Preço, Sala, etc.)
   * @returns O objeto completo da sessão de coaching recém-criada, incluindo o ID gerado automaticamente.
   */
  @Post()
  @ApiOperation({ 
    summary: 'Criar nova sessão de coaching', 
    description: 'Criar uma nova sessão de coaching na base de dados.' 
  })
  @ApiBody({ 
    type: CreateCoachingDto, 
    description: 'A estrutura de dados (Payload) necessária para criar a sessão.' 
  })
  @ApiResponse({ status: 201, description: 'A sessão de coaching foi criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Os dados enviados são inválidos (ex: falta a Duração).' })
  @ApiResponse({ status: 500, description: 'Erro interno (ex: o ID da Sala não existe).' })
  create(@Body() createCoachingDto: CreateCoachingDto) {
    return this.coachingService.create(createCoachingDto);
  }

  @Delete('remover-aluno/:idAluno/coaching/:idCoaching')
  @ApiOperation({ summary: 'Remover aluno de sessão de coaching' })
  async removerAluno(
    @Param('idAluno') idAluno: number,
    @Param('idCoaching') idCoaching: number
  ) {
    return this.coachingService.removerAluno(idAluno, idCoaching);
  }


  @Post('disponibilidade/:id/inscrever-aluno')
  @ApiOperation({summary: 'Inscrever aluno em sessão de coaching'})
  async inscreverAluno(
    @Param('id') idDisponibilidade: string,
    @Body() body: InscreverAlunoDto
  ) {
    return this.coachingService.inscreverAluno(+idDisponibilidade, body);
  }

  @Get('estudios')
  @ApiOperation({
    summary: 'Listar todos os estúdios',
    description: 'Retorna uma lista completa de todas as salas/estúdios da escola, incluindo o seu estado atual de disponibilidade.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sucesso: Lista de estúdios retornada com sucesso.' 
  })
  async getAllStudios() {
    return this.gestaoEstudiosService.getAllStudios();
  }

  /**
   * Tranca/bloqueia um estúdio específico na base de dados, alterando o seu estado de disponibilidade para 'false'.
   * Útil para períodos de manutenção, limpeza ou quando a sala é desativada, impedindo novas marcações de coaching.
   * * @param id O identificador único numérico da Sala/Estúdio que vem no URL do pedido.
   * @returns Um objeto JSON contendo uma mensagem de sucesso e os dados completos do estúdio atualizado.
   * @throws {NotFoundException} Retorna erro 404 caso o ID do estúdio não exista na base de dados.
   * @throws {BadRequestException} Retorna erro 400 caso o estúdio já se encontre bloqueado.
   */
  @Patch('estudios/:id/bloquear')
  @ApiOperation({
    summary: 'Bloquear/trancar estúdio',
    description: 'Altera o estado de um estúdio para indisponível. Garante primeiro que o estúdio existe e que ainda não está bloqueado antes de efetuar a alteração na base de dados.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sucesso: O estúdio foi bloqueado corretamente. Retorna a mensagem e o objeto da sala.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request: O estúdio já se encontra bloqueado ou o ID enviado tem um formato inválido.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not Found: O estúdio com o ID fornecido não foi encontrado no sistema.' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error: Erro inesperado de comunicação com a base de dados.' 
  })
  async lockStudio(@Param('id') id: string) {
    // '+' converte a string que vem do URL para o tipo 'number' exigido pelo Service
    return this.gestaoEstudiosService.lockStudio(+id);
  }


  /**
   * Destranca/desbloqueia um estúdio específico na base de dados, alterando o seu estado de disponibilidade para 'true'.
   * Útil para tornar a sala novamente disponível após períodos de manutenção, limpeza, etc.
   * * @param id O identificador único numérico da Sala/Estúdio que vem no URL do pedido.
   * @returns Um objeto JSON contendo uma mensagem de sucesso e os dados completos do estúdio atualizado.
   * @throws {NotFoundException} Retorna erro 404 caso o ID do estúdio não exista na base de dados.
   * @throws {BadRequestException} Retorna erro 400 caso o estúdio já se encontre desbloqueado.
   */
  @Patch('estudios/:id/desbloquear')
  @ApiOperation({
    summary: 'Desbloquear/destrancar estúdio',
    description: 'Altera o estado de um estúdio para disponível. Garante primeiro que o estúdio existe e que ainda não está desbloqueado antes de efetuar a alteração na base de dados.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sucesso: O estúdio foi desbloqueado corretamente. Retorna a mensagem e o objeto da sala.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request: O estúdio já se encontra desbloqueado ou o ID enviado tem um formato inválido.' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not Found: O estúdio com o ID fornecido não foi encontrado no sistema.' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error: Erro inesperado de comunicação com a base de dados.' 
  })
  async unlockStudio(@Param('id') id: string) {
    return this.gestaoEstudiosService.unlockStudio(+id);
  }

  @Get('admin/sessoes-futuras')
  @ApiOperation({ summary: 'Obter sessões futuras para gestão do admin' })
  async getSessoesFuturasAdmin() {
    return this.coachingService.getSessoesFuturasAdmin();
  }

  @Get('admin/kpis')
  @ApiOperation({ summary: 'Obter KPIs para o dashboard do admin' })
  async getKpisAdmin() {
    return this.coachingService.getKpisAdmin();
  }

  @Get('aluno/:id/detalhes')
  @ApiOperation({ summary: 'Obter detalhes do aluno e do seu encarregado' })
  async getAlunoDetalhes(@Param('id', ParseIntPipe) id: number) {
    return this.coachingService.getAlunoDetalhes(id);
  }

  @Get('marcacoes')
    @ApiOperation({ summary: 'Obtém a agenda pura de marcações de coaching do utilizador' })
    async getMarcacoes(
        @Headers('authorization') authHeader: string
    ) {
        // 1. Verificação do Segurança (Token)
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Acesso negado: Token não encontrado na mochila.');
        }

        const token = authHeader.split(' ')[1];
        let userPayload;

        // 2. Descodifica a mochila para saber quem é
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            userPayload = JSON.parse(jsonPayload);
        } catch (e) {
            throw new UnauthorizedException('Token inválido ou corrompido.');
        }

        const role = userPayload.role;
        const userId = userPayload.sub;

        // 3. Chama o Service que criámos na mensagem anterior!
        // ATENÇÃO: Muda "this.coachingService" para o nome do service onde colocaste a função
        return this.coachingService.getMarcacoesProfessor(role, userId);
    }
  
}


