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
  Res,
  Query,
  Request,
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
import type { Response } from 'express';
import { CreatePedidoCoachingDto } from './dto/create-pedido-coaching.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';

const TODAS_AS_ROLES = [
    Role.COORDENADOR,
    Role.PROFESSOR,
    Role.ENC_EDUCACAO,
];

/**
 * Controlador responsavel pelos pedidos de Coaching.
 */

@UseGuards(AuthGuard, RolesGuard)
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

  @Roles(Role.ENC_EDUCACAO)
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

  @Roles(Role.ENC_EDUCACAO, Role.PROFESSOR)
  @Get('propostas/contexto')
  @ApiOperation({ summary: 'Obter dados auxiliares para criar proposta de coaching' })
  async getContextoProposta(@Request() req: { user: UtilizadorAutenticado }) {
    return this.coachingService.listarContextoProposta(req.user);
  }

  @Roles(Role.PROFESSOR)
  @Get('propostas/encarregados')
  @ApiOperation({ summary: 'Pesquisar encarregados e educandos para proposta do professor' })
  async pesquisarEncarregados(@Query('search') search = '') {
    return this.coachingService.pesquisarEncarregadosComAlunos(search);
  }

  @Roles(Role.ENC_EDUCACAO, Role.PROFESSOR)
  @Post('propostas')
  @ApiOperation({ summary: 'Criar proposta de sessao unica de coaching' })
  async criarPedidoCoaching(
    @Body() dto: CreatePedidoCoachingDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.coachingService.criarPedidoCoaching(dto, req.user);
  }

  @Roles(Role.COORDENADOR)
  @Get('admin/propostas-pendentes')
  @ApiOperation({ summary: 'Listar propostas de coaching pendentes de aprovacao' })
  async listarPedidosPendentes() {
    return this.coachingService.listarPedidosPendentesAdmin();
  }

  @Roles(Role.COORDENADOR)
  @Patch('admin/propostas/:id/aprovar')
  @ApiOperation({ summary: 'Aprovar proposta e criar sessao efetiva de coaching' })
  async aprovarPedido(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.coachingService.aprovarPedidoCoaching(id, req.user);
  }

  @Roles(Role.COORDENADOR)
  @Patch('admin/propostas/:id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar proposta de coaching' })
  async rejeitarPedido(@Param('id', ParseIntPipe) id: number) {
    return this.coachingService.rejeitarPedidoCoaching(id);
  }
  /**
   * Executa a operacao remover aluno.
   * @param idAluno Dados recebidos para a operacao.
   * @param idCoaching Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES)
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
  @Roles(Role.ENC_EDUCACAO)
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
  @Roles(...TODAS_AS_ROLES)
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

  @Roles(Role.COORDENADOR)
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

  @Roles(Role.COORDENADOR)
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

  @Roles(Role.COORDENADOR)
  @Get('admin/sessoes-futuras')
  @ApiOperation({ summary: 'Obter sessões futuras para gestão do admin' })
  async getSessoesFuturasAdmin() {
    return this.coachingService.getSessoesFuturasAdmin();
  }
  /**
   * Executa a operacao get sessoes por validar admin.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('admin/sessoes-por-validar')
  @ApiOperation({ summary: 'Obter sessoes terminadas por validar para gestao do admin' })
  async getSessoesPorValidarAdmin() {
    return this.coachingService.getSessoesPorValidarAdmin();
  }
  /**
   * Executa a operacao get sessoes realizadas no mes admin.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('admin/sessoes-realizadas-mes')
  @ApiOperation({ summary: 'Obter sessoes realizadas no mes para gestao do admin' })
  async getSessoesRealizadasMesAdmin() {
    return this.coachingService.getSessoesRealizadasMesAdmin();
  }
  /**
   * Executa a operacao get kpis admin.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
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

  @Roles(Role.COORDENADOR, Role.PROFESSOR)
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

  @Roles(...TODAS_AS_ROLES)
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

  @Roles(Role.PROFESSOR)
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

  @Roles(Role.COORDENADOR)
  @Get('exportar-excel')
  @ApiOperation({
    summary: 'Exportar sessões validadas para Excel',
  })
  async exportarSessoesExcel(@Res() res: Response) {
    // 1. Pede ao serviço para gerar o ficheiro em memória (Buffer)
    const excelBuffer = await this.coachingService.gerarExcelSessoesValidadas();

    // 2. Prepara os cabeçalhos HTTP para enganar o browser a fazer download
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sessoes_validadas.xlsx"',
      'Content-Length': excelBuffer.length,
    });

    // 3. Envia o ficheiro para o React!
    res.end(excelBuffer);
  }

}
