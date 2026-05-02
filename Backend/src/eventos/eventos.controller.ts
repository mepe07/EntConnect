// Ficheiro: Backend/src/eventos/eventos.controller.ts

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
import { Role } from '../auth/enums/roles.enum';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

@Controller('eventos')
export class EventosController {
    constructor(private readonly eventosService: EventosService) { }

    // ========================================================================
    // ROTAS PÚBLICAS
    // Estas rotas não têm AuthGuard porque são usadas no login e na página pública.
    // ========================================================================

    @Get('publicos')
    listarEventosPublicos(@Query() filtros: ListarEventosPublicosDto) {
        return this.eventosService.listarEventosPublicos(filtros);
    }

    @Get('publicos/login-toast')
    listarEventosLoginToast() {
        return this.eventosService.listarEventosLoginToast();
    }

    @Get('publicos/:slug')
    obterEventoPublicoPorSlug(@Param('slug') slug: string) {
        return this.eventosService.obterEventoPublicoPorSlug(slug);
    }

    // ========================================================================
    // ROTAS DE GESTÃO
    // Estas rotas exigem login e validação de role no service.
    // ========================================================================

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.COORDENADOR)
    @Get('gestao')
    listarEventosGestao(
        @Query() filtros: ListarEventosGestaoDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.eventosService.listarEventosGestao(filtros, req.user);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.COORDENADOR)
    @Get('gestao/:id')
    obterEventoGestao(
        @Param('id', ParseIntPipe) idEvento: number,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.eventosService.obterEventoGestao(idEvento, req.user);
    }

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

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.COORDENADOR)
    @Delete(':id')
    removerEvento(
        @Param('id', ParseIntPipe) idEvento: number,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.eventosService.removerEvento(idEvento, req.user);
    }

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