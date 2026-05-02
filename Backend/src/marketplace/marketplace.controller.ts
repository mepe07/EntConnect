// Ficheiro: Backend/src/marketplace/marketplace.controller.ts

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';

import { MarketplaceService } from './marketplace.service';
import { ListarAnunciosMarketplaceDto } from './dto/listar-anuncios-marketplace.dto';
import { CriarAnuncioMarketplaceDto } from './dto/criar-anuncio-marketplace.dto';
import { AtualizarAnuncioMarketplaceDto } from './dto/atualizar-anuncio-marketplace.dto';
import { AlterarEstadoAnuncioDto } from './dto/alterar-estado-anuncio.dto';
import { ModerarAnuncioMarketplaceDto } from './dto/moderar-anuncio-marketplace.dto';
import { PublicarInventarioEscolaDto } from './dto/publicar-inventario-escola.dto';
import { RegistarInteresseMarketplaceDto } from './dto/registar-interesse-marketplace.dto';
import { CriarItemInventarioDto } from './dto/criar-item-inventario.dto';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';

// Roles que podem usar as funcionalidades normais do Marketplace.
const TODAS_AS_ROLES_MARKETPLACE = [
    Role.COORDENADOR,
    Role.PROFESSOR,
    Role.ENC_EDUCACAO,
];

// Todas as rotas deste controller exigem token JWT válido.
// Depois, cada endpoint define as roles permitidas através do @Roles(...).
@UseGuards(AuthGuard, RolesGuard)
@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

    // ========================================================================
    // MODERAÇÃO DO MARKETPLACE
    // ========================================================================
    // Rotas exclusivas da Coordenadora.
    //
    // Nota importante:
    // Estas rotas ficam antes de @Get('anuncios/:id') para evitar que
    // "moderafocao" seja interpretado como se sse um ID de anúncio.
    // ========================================================================

    @Roles(Role.COORDENADOR)
    @Get('anuncios/moderacao')
    listarAnunciosModeracao(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarAnunciosModeracao(req.user);
    }

    @Roles(Role.COORDENADOR)
    @Get('moderacao/registo')
    listarRegistoModeracao(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarRegistoModeracao(req.user);
    }

    @Roles(Role.COORDENADOR)
    @Post('anuncios/:id/moderar')
    moderarAnuncio(
        @Param('id') idArtigo: string,
        @Body() dto: ModerarAnuncioMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.moderarAnuncio(+idArtigo, dto, req.user);
    }

    // ========================================================================
    // INVENTÁRIO DA ESCOLA
    // ========================================================================
    // Rotas exclusivas da Coordenadora.
    // Permitem gerir o inventário interno e publicar itens como anúncios.
    // ========================================================================

    @Roles(Role.COORDENADOR)
    @Get('inventario-escola')
    listarInventarioDaEscola(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarInventarioDaEscola(req.user);
    }

    @Roles(Role.COORDENADOR)
    @Get('inventario-escola/disponivel-para-publicacao')
    listarInventarioDisponivelParaPublicacao(
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.listarInventarioDisponivelParaPublicacao(req.user);
    }

    @Roles(Role.COORDENADOR)
    @Post('inventario-escola/publicar')
    publicarInventarioDaEscola(
        @Body() dto: PublicarInventarioEscolaDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.publicarInventarioDaEscola(dto, req.user);
    }

    @Roles(Role.COORDENADOR)
    @Post('inventario')
    @UseInterceptors(FileInterceptor('foto')) // O nome 'foto' tem de bater certo com o FormData do frontend.
    criarItemInventario(
        @Body() dto: CriarItemInventarioDto,
        @Request() req: { user: UtilizadorAutenticado },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.marketplaceService.criarItemInventario(dto, req.user, file);
    }

    // ========================================================================
    // MARKETPLACE GERAL
    // ========================================================================
    // Rotas acessíveis a Coordenador, Professor e Encarregado de Educação.
    // Incluem listagem, criação, edição e remoção de anúncios.
    // ========================================================================

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios')
    listarAnuncios(@Query() filtros: ListarAnunciosMarketplaceDto) {
        return this.marketplaceService.listarAnuncios(filtros);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('meus-anuncios')
    listarMeusAnuncios(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarMeusAnuncios(req.user);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios/:id')
    obterAnuncio(@Param('id') idArtigo: string) {
        return this.marketplaceService.obterAnuncio(+idArtigo);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Post('anuncios')
    @UseInterceptors(FileInterceptor('foto')) // Interceta o campo 'foto' enviado no FormData.
    criarAnuncio(
        @Body() dto: CriarAnuncioMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.marketplaceService.criarAnuncio(dto, req.user, file);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Patch('anuncios/:id')
    @UseInterceptors(FileInterceptor('foto'))
    atualizarAnuncio(
        @Param('id') idArtigo: string,
        @Body() dto: AtualizarAnuncioMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.marketplaceService.atualizarAnuncio(+idArtigo, dto, req.user, file);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Patch('anuncios/:id/estado')
    alterarEstado(
        @Param('id') idArtigo: string,
        @Body() dto: AlterarEstadoAnuncioDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.alterarEstado(+idArtigo, dto, req.user);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Delete('anuncios/:id')
    removerAnuncio(
        @Param('id') idArtigo: string,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.removerAnuncio(+idArtigo, req.user);
    }

    // ========================================================================
    // INTERESSES EM ANÚNCIOS
    // ========================================================================
    // Rotas acessíveis a Coordenador, Professor e Encarregado de Educação.
    //
    // A role deixa o utilizador entrar na rota.
    // A regra de "owner" continua no service, porque depende do anúncio concreto.
    // ========================================================================

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Post('anuncios/:id/interesse')
    registarInteresse(
        @Param('id') idArtigo: string,
        @Body() dto: RegistarInteresseMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.registarInteresse(+idArtigo, dto, req.user);
    }

    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios/:id/interesses')
    listarInteressesDoAnuncio(
        @Param('id') idArtigo: string,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.listarInteressesDoAnuncio(+idArtigo, req.user);
    }
} 