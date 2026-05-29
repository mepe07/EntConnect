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
import { CriarPedidoAluguerDto } from './dto/criar-pedido-aluguer.dto';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';

const TODAS_AS_ROLES_MARKETPLACE = [
  Role.COORDENADOR,
  Role.PROFESSOR,
  Role.ENC_EDUCACAO,
];
/**
 * Controlador responsavel pelos pedidos de Marketplace.
 */

@UseGuards(AuthGuard, RolesGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}
  /**
   * Executa a operacao listar anuncios moderacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('anuncios/moderacao')
  listarAnunciosModeracao(@Request() req: { user: UtilizadorAutenticado }) {
    return this.marketplaceService.listarAnunciosModeracao(req.user);
  }
  /**
   * Executa a operacao listar registo moderacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('moderacao/registo')
  listarRegistoModeracao(@Request() req: { user: UtilizadorAutenticado }) {
    return this.marketplaceService.listarRegistoModeracao(req.user);
  }
  /**
   * Executa a operacao moderar anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Post('anuncios/:id/moderar')
  moderarAnuncio(
    @Param('id') idArtigo: string,
    @Body() dto: ModerarAnuncioMarketplaceDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.moderarAnuncio(+idArtigo, dto, req.user);
  }
  /**
   * Executa a operacao listar inventario da escola.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('inventario-escola')
  listarInventarioDaEscola(@Request() req: { user: UtilizadorAutenticado }) {
    return this.marketplaceService.listarInventarioDaEscola(req.user);
  }
  /**
   * Executa a operacao listar inventario disponivel para publicacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Get('inventario-escola/disponivel-para-publicacao')
  listarInventarioDisponivelParaPublicacao(
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.listarInventarioDisponivelParaPublicacao(
      req.user,
    );
  }
  /**
   * Executa a operacao publicar inventario da escola.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Post('inventario-escola/publicar')
  publicarInventarioDaEscola(
    @Body() dto: PublicarInventarioEscolaDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.publicarInventarioDaEscola(dto, req.user);
  }
  /**
   * Executa a operacao criar item inventario.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(Role.COORDENADOR)
  @Post('inventario')
  @UseInterceptors(FileInterceptor('foto'))
  criarItemInventario(
    @Body() dto: CriarItemInventarioDto,
    @Request() req: { user: UtilizadorAutenticado },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.marketplaceService.criarItemInventario(dto, req.user, file);
  }
  /**
   * Executa a operacao listar anuncios.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('anuncios')
  listarAnuncios(@Query() filtros: ListarAnunciosMarketplaceDto) {
    return this.marketplaceService.listarAnuncios(filtros);
  }
  /**
   * Executa a operacao listar meus anuncios.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('meus-anuncios')
  listarMeusAnuncios(@Request() req: { user: UtilizadorAutenticado }) {
    return this.marketplaceService.listarMeusAnuncios(req.user);
  }

  /**
   * Executa a operacao listar meus alugueres.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('meus-alugueres')
  listarMeusAlugueres(@Request() req: { user: UtilizadorAutenticado }) {
    return this.marketplaceService.listarMeusAlugueres(req.user);
  }
  /**
   * Executa a operacao obter anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('anuncios/:id')
  obterAnuncio(@Param('id') idArtigo: string) {
    return this.marketplaceService.obterAnuncio(+idArtigo);
  }

  /**
   * Executa a operacao obter calendario do anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('anuncios/:id/calendario')
  obterCalendarioAnuncio(
    @Param('id') idArtigo: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.obterCalendarioAnuncio(+idArtigo, req.user);
  }
  /**
   * Executa a operacao criar anuncio.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Post('anuncios')
  @UseInterceptors(FileInterceptor('foto'))
  criarAnuncio(
    @Body() dto: CriarAnuncioMarketplaceDto,
    @Request() req: { user: UtilizadorAutenticado },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.marketplaceService.criarAnuncio(dto, req.user, file);
  }
  /**
   * Executa a operacao atualizar anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('anuncios/:id')
  @UseInterceptors(FileInterceptor('foto'))
  atualizarAnuncio(
    @Param('id') idArtigo: string,
    @Body() dto: AtualizarAnuncioMarketplaceDto,
    @Request() req: { user: UtilizadorAutenticado },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.marketplaceService.atualizarAnuncio(
      +idArtigo,
      dto,
      req.user,
      file,
    );
  }
  /**
   * Executa a operacao alterar estado.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('anuncios/:id/estado')
  alterarEstado(
    @Param('id') idArtigo: string,
    @Body() dto: AlterarEstadoAnuncioDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.alterarEstado(+idArtigo, dto, req.user);
  }
  /**
   * Executa a operacao remover anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Delete('anuncios/:id')
  removerAnuncio(
    @Param('id') idArtigo: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.removerAnuncio(+idArtigo, req.user);
  }
  /**
   * Executa a operacao registar interesse.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Post('anuncios/:id/interesse')
  registarInteresse(
    @Param('id') idArtigo: string,
    @Body() dto: RegistarInteresseMarketplaceDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.registarInteresse(+idArtigo, dto, req.user);
  }

  /**
   * Executa a operacao criar pedido de aluguer.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Post('anuncios/:id/pedidos-aluguer')
  criarPedidoAluguer(
    @Param('id') idArtigo: string,
    @Body() dto: CriarPedidoAluguerDto,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.criarPedidoAluguer(+idArtigo, dto, req.user);
  }

  /**
   * Executa a operacao aceitar pedido de aluguer.
   * @param idInteresse Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('pedidos-aluguer/:id/aceitar')
  aceitarPedidoAluguer(
    @Param('id') idInteresse: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.aceitarPedidoAluguer(+idInteresse, req.user);
  }

  /**
   * Executa a operacao rejeitar pedido de aluguer.
   * @param idInteresse Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('pedidos-aluguer/:id/rejeitar')
  rejeitarPedidoAluguer(
    @Param('id') idInteresse: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.rejeitarPedidoAluguer(+idInteresse, req.user);
  }

  /**
   * Executa a operacao marcar aluguer como devolvido.
   * @param idAluguer Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('alugueres/:id/marcar-devolvido')
  marcarAluguerComoDevolvido(
    @Param('id') idAluguer: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.marcarAluguerComoDevolvido(
      +idAluguer,
      req.user,
    );
  }

  /**
   * Executa a operacao confirmar devolucao de aluguer.
   * @param idAluguer Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Patch('alugueres/:id/confirmar-devolucao')
  confirmarDevolucaoAluguer(
    @Param('id') idAluguer: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.confirmarDevolucaoAluguer(
      +idAluguer,
      req.user,
    );
  }
  /**
   * Executa a operacao listar interesses do anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Roles(...TODAS_AS_ROLES_MARKETPLACE)
  @Get('anuncios/:id/interesses')
  listarInteressesDoAnuncio(
    @Param('id') idArtigo: string,
    @Request() req: { user: UtilizadorAutenticado },
  ) {
    return this.marketplaceService.listarInteressesDoAnuncio(
      +idArtigo,
      req.user,
    );
  }
}
