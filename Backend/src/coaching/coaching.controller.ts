import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UnauthorizedException,
  Headers,
  UseGuards,
} from '@nestjs/common';
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/auth.guard';
/**
 * Controlador responsavel pelos pedidos de Coaching.
 */

@ApiTags('Coaching')
@UseGuards(AuthGuard, RolesGuard)
@Controller('coaching')
export class CoachingController {
  constructor(
    private readonly coachingService: CoachingService,
    private readonly gestaoEstudiosService: GestaoEstudiosService,
    private readonly modalidadesService: ModalidadeService,
  ) {}
  /**
   * Cria um novo registo.
   * @param createCoachingDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post()
  @ApiOperation({
    summary: 'Criar nova sessão de coaching',
    description: 'Criar uma nova sessão de coaching na base de dados.',
  })
  @ApiBody({
    type: CreateCoachingDto,
    description:
      'A estrutura de dados (Payload) necessária para criar a sessão.',
  })
  @ApiResponse({
    status: 201,
    description: 'A sessão de coaching foi criada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Os dados enviados são inválidos (ex: falta a Duração).',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno (ex: o ID da Sala não existe).',
  })
  create(@Body() createCoachingDto: CreateCoachingDto) {
    return this.coachingService.create(createCoachingDto);
  }
  /**
   * Executa a operacao remover aluno.
   * @param idAluno Dados recebidos para a operacao.
   * @param idCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Delete('remover-aluno/:idAluno/coaching/:idCoaching')
  @ApiOperation({ summary: 'Remover aluno de sessão de coaching' })
  async removerAluno(
    @Param('idAluno') idAluno: number,
    @Param('idCoaching') idCoaching: number,
  ) {
    return this.coachingService.removerAluno(idAluno, idCoaching);
  }
  /**
   * Executa a operacao inscrever aluno.
   * @param idDisponibilidade Dados recebidos para a operacao.
   * @param body Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Post('disponibilidade/:id/inscrever-aluno')
  @ApiOperation({ summary: 'Inscrever aluno em sessão de coaching' })
  async inscreverAluno(
    @Param('id') idDisponibilidade: string,
    @Body() body: InscreverAlunoDto,
  ) {
    return this.coachingService.inscreverAluno(+idDisponibilidade, body);
  }
  /**
   * Executa a operacao get all studios.
   * @returns Resultado da operacao.
   */

  @Get('estudios')
  @ApiOperation({
    summary: 'Listar todos os estúdios',
    description:
      'Retorna uma lista completa de todas as salas/estúdios da escola, incluindo o seu estado atual de disponibilidade.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sucesso: Lista de estúdios retornada com sucesso.',
  })
  async getAllStudios() {
    return this.gestaoEstudiosService.getAllStudios();
  }
  /**
   * Executa a operacao lock studio.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch('estudios/:id/bloquear')
  @ApiOperation({
    summary: 'Bloquear/trancar estúdio',
    description:
      'Altera o estado de um estúdio para indisponível. Garante primeiro que o estúdio existe e que ainda não está bloqueado antes de efetuar a alteração na base de dados.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Sucesso: O estúdio foi bloqueado corretamente. Retorna a mensagem e o objeto da sala.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request: O estúdio já se encontra bloqueado ou o ID enviado tem um formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not Found: O estúdio com o ID fornecido não foi encontrado no sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error: Erro inesperado de comunicação com a base de dados.',
  })
  async lockStudio(@Param('id') id: string) {
    return this.gestaoEstudiosService.lockStudio(+id);
  }
  /**
   * Executa a operacao unlock studio.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch('estudios/:id/desbloquear')
  @ApiOperation({
    summary: 'Desbloquear/destrancar estúdio',
    description:
      'Altera o estado de um estúdio para disponível. Garante primeiro que o estúdio existe e que ainda não está desbloqueado antes de efetuar a alteração na base de dados.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Sucesso: O estúdio foi desbloqueado corretamente. Retorna a mensagem e o objeto da sala.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request: O estúdio já se encontra desbloqueado ou o ID enviado tem um formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not Found: O estúdio com o ID fornecido não foi encontrado no sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error: Erro inesperado de comunicação com a base de dados.',
  })
  async unlockStudio(@Param('id') id: string) {
    return this.gestaoEstudiosService.unlockStudio(+id);
  }
  /**
   * Executa a operacao get sessoes futuras admin.
   * @returns Resultado da operacao.
   */

  @Get('admin/sessoes-futuras')
  @ApiOperation({ summary: 'Obter sessões futuras para gestão do admin' })
  async getSessoesFuturasAdmin() {
    return this.coachingService.getSessoesFuturasAdmin();
  }
  /**
   * Executa a operacao get kpis admin.
   * @returns Resultado da operacao.
   */

  @Get('admin/kpis')
  @ApiOperation({ summary: 'Obter KPIs para o dashboard do admin' })
  async getKpisAdmin() {
    return this.coachingService.getKpisAdmin();
  }
  /**
   * Executa a operacao get aluno detalhes.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('aluno/:id/detalhes')
  @ApiOperation({ summary: 'Obter detalhes do aluno e do seu encarregado' })
  async getAlunoDetalhes(@Param('id', ParseIntPipe) id: number) {
    return this.coachingService.getAlunoDetalhes(id);
  }
  /**
   * Executa a operacao get marcacoes.
   * @param authHeader Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('marcacoes')
  @ApiOperation({
    summary: 'Obtém a agenda pura de marcações de coaching do utilizador',
  })
  async getMarcacoes(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Acesso negado: Token não encontrado na mochila.',
      );
    }

    const token = authHeader.split(' ')[1];
    let userPayload;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      userPayload = JSON.parse(jsonPayload);
    } catch (e) {
      throw new UnauthorizedException('Token inválido ou corrompido.');
    }

    const role = userPayload.role;
    const userId = userPayload.sub;

    return this.coachingService.getMarcacoesProfessor(role, userId);
  }
  /**
   * Executa a operacao confirmar professor.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch(':id/confirmar-professor')
  @ApiOperation({
    summary: 'Professor: Confirmar realização da sessão',
    description:
      'Permite ao professor confirmar que a sessão de coaching foi efetivamente realizada.',
  })
  @ApiResponse({ status: 200, description: 'Sessão confirmada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'A sessão ainda não se iniciou ou já está concluída.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sessão de coaching não encontrada.',
  })
  async confirmarProfessor(@Param('id', ParseIntPipe) id: number) {
    return this.coachingService.confirmarSessaoProfessor(id);
  }
}
