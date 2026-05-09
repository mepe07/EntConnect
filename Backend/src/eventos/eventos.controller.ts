import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { ListarEventosPublicosDto } from './dto/listar-eventos-publicos.dto';
import { ListarEventosGestaoDto } from './dto/listar-eventos-gestao.dto';
import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '../auth/enums/roles.enum';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { ApiTags } from '@nestjs/swagger/dist/decorators/api-use-tags.decorator';
/**
 * Controlador responsavel pelos pedidos de Eventos.
 */

@ApiTags('Eventos')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}
  /**
   * Executa a operacao listar eventos publicos.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Public()
  @Get('publicos')
  listarEventosPublicos(@Query() filtros: ListarEventosPublicosDto) {
    return this.eventosService.listarEventosPublicos(filtros);
  }
  /**
   * Executa a operacao listar eventos login toast.
   * @returns Resultado da operacao.
   */

  @Public()
  @Get('publicos/login-toast')
  listarEventosLoginToast() {
    return this.eventosService.listarEventosLoginToast();
  }
  /**
   * Executa a operacao obter evento publico por slug.
   * @param slug Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Public()
  @Get('publicos/:slug')
  obterEventoPublicoPorSlug(@Param('slug') slug: string) {
    return this.eventosService.obterEventoPublicoPorSlug(slug);
  }
  /**
   * Executa a operacao listar eventos gestao.
   * @param filtros Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Get('gestao')
  listarEventosGestao(
    @Query() filtros: ListarEventosGestaoDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.eventosService.listarEventosGestao(filtros, req.user);
  }
  /**
   * Executa a operacao obter evento gestao.
   * @param idEvento Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Get('gestao/:id')
  obterEventoGestao(
    @Param('id', ParseIntPipe) idEvento: number,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.eventosService.obterEventoGestao(idEvento, req.user);
  }
  /**
   * Executa a operacao criar evento.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @param imagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Post()
  @UseInterceptors(FileInterceptor('imagem'))
  criarEvento(
    @Body() dto: CriarEventoDto,
    @Request() req: { user: UtilizadorAutenticado },
    @UploadedFile() imagem?: Express.Multer.File,
  ) {
    return this.eventosService.criarEvento(dto, req.user, imagem);
  }
  /**
   * Executa a operacao atualizar evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @param imagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('imagem'))
  atualizarEvento(
    @Param('id', ParseIntPipe) idEvento: number,
    @Body() dto: AtualizarEventoDto,
    @Request() req: { user: UtilizadorAutenticado },
    @UploadedFile() imagem?: Express.Multer.File,
  ) {
    return this.eventosService.atualizarEvento(idEvento, dto, req.user, imagem);
  }
  /**
   * Executa a operacao remover evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Delete(':id')
  removerEvento(
    @Param('id', ParseIntPipe) idEvento: number,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.eventosService.removerEvento(idEvento, req.user);
  }
  /**
   * Executa a operacao reativar evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.COORDENADOR)
  @Patch(':id/reativar')
  reativarEvento(
    @Param('id', ParseIntPipe) idEvento: number,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.eventosService.reativarEvento(idEvento, req.user);
  }
}
