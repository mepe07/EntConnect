// Ficheiro: src/marketplace/marketplace.controller.ts

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

/**
 * Roles com acesso às funcionalidades normais do Marketplace.
 *
 * Estas roles representam utilizadores autenticados que podem consultar anúncios,
 * criar anúncios, editar os próprios anúncios e registar interesse.
 *
 * As operações administrativas, como moderação e gestão do inventário da escola,
 * continuam reservadas à Coordenadora.
 */
const TODAS_AS_ROLES_MARKETPLACE = [
    Role.COORDENADOR,
    Role.PROFESSOR,
    Role.ENC_EDUCACAO,
];

/**
 * Controller dos endpoints do Marketplace.
 *
 * Responsabilidades:
 * - expor rotas HTTP;
 * - aplicar AuthGuard e RolesGuard;
 * - receber DTOs, params, query params e ficheiros;
 * - encaminhar a lógica para o MarketplaceService.
 *
 * Este controller não deve conter regra de negócio pesada.
 * A validação detalhada, transações, permissões internas, stock, imagens e moderação
 * ficam no service e nos helpers do módulo.
 */
@UseGuards(AuthGuard, RolesGuard)
@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

    // ========================================================================
    // MODERAÇÃO DO MARKETPLACE
    // ========================================================================
    // Rotas exclusivas da Coordenadora.
    //
    // Estas rotas estão antes de @Get('anuncios/:id') para evitar conflito
    // com rotas dinâmicas, onde "moderacao" poderia ser interpretado como id.
    // ========================================================================

    /**
     * Lista anúncios disponíveis para análise/moderação.
     *
     * Apenas a Coordenadora pode aceder a esta rota.
     */
    @Roles(Role.COORDENADOR)
    @Get('anuncios/moderacao')
    listarAnunciosModeracao(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarAnunciosModeracao(req.user);
    }

    /**
     * Lista o histórico de moderação do Marketplace.
     *
     * Permite consultar ações administrativas efetuadas sobre anúncios,
     * incluindo estado anterior, novo estado, moderador e motivo.
     */
    @Roles(Role.COORDENADOR)
    @Get('moderacao/registo')
    listarRegistoModeracao(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarRegistoModeracao(req.user);
    }

    /**
     * Aplica uma ação de moderação a um anúncio.
     *
     * A ação vem no DTO e pode representar, por exemplo:
     * - remover;
     * - reativar;
     * - arquivar.
     *
     * A decisão do novo estado é feita no helper de moderação.
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

    // ========================================================================
    // INVENTÁRIO DA ESCOLA
    // ========================================================================
    // Rotas exclusivas da Coordenadora.
    // Permitem gerir o inventário interno e publicar itens como anúncios.
    // ========================================================================

    /**
     * Lista os itens do inventário institucional da escola.
     *
     * Esta rota é administrativa e permite consultar artigos que pertencem
     * ao inventário interno, estejam ou não publicados no Marketplace.
     */
    @Roles(Role.COORDENADOR)
    @Get('inventario-escola')
    listarInventarioDaEscola(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarInventarioDaEscola(req.user);
    }

    /**
     * Lista itens do inventário que ainda podem ser publicados no Marketplace.
     *
     * Usado para a Coordenadora escolher que artigos internos passam a estar
     * disponíveis para venda, aluguer ou ambos.
     */
    @Roles(Role.COORDENADOR)
    @Get('inventario-escola/disponivel-para-publicacao')
    listarInventarioDisponivelParaPublicacao(
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.listarInventarioDisponivelParaPublicacao(req.user);
    }

    /**
     * Publica um item do inventário da escola no Marketplace.
     *
     * O artigo já existe na base de dados como inventário.
     * Esta rota apenas transforma esse item num anúncio publicado.
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
     * Cria um novo item no inventário da escola.
     *
     * Pode receber uma imagem através do campo "foto" no FormData.
     * O ficheiro é enviado para o service, onde será validado e guardado.
     */
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

    /**
     * Lista anúncios do Marketplace.
     *
     * Aceita filtros por query params, como pesquisa, tipo, estado, origem,
     * criador e publicação.
     */
    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios')
    listarAnuncios(@Query() filtros: ListarAnunciosMarketplaceDto) {
        return this.marketplaceService.listarAnuncios(filtros);
    }

    /**
     * Lista os anúncios criados pelo utilizador autenticado.
     *
     * O utilizador é obtido a partir do token JWT validado pelo AuthGuard.
     */
    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('meus-anuncios')
    listarMeusAnuncios(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarMeusAnuncios(req.user);
    }

    /**
     * Obtém o detalhe de um anúncio específico.
     *
     * O id chega como string através dos params da rota e é convertido para number
     * antes de ser enviado ao service.
     */
    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios/:id')
    obterAnuncio(@Param('id') idArtigo: string) {
        return this.marketplaceService.obterAnuncio(+idArtigo);
    }

    /**
     * Cria um novo anúncio no Marketplace.
     *
     * Pode receber uma imagem através de multipart/form-data.
     * O controller apenas captura o ficheiro; validação e upload ficam no service.
     */
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

    /**
     * Atualiza um anúncio existente.
     *
     * Pode receber novos dados no body e, opcionalmente, uma nova imagem.
     * A validação de dono/moderação e a atualização de stock ficam no service.
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
        return this.marketplaceService.atualizarAnuncio(+idArtigo, dto, req.user, file);
    }

    /**
     * Altera o estado de um anúncio.
     *
     * Usado em fluxos como remover, reservar, concluir ou reativar,
     * conforme as regras existentes no MarketplaceService.
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
     * Remove logicamente um anúncio criado pelo utilizador.
     *
     * O registo não é apagado da base de dados.
     * O service altera o estado para removido e retira da listagem ativa.
     */
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

    /**
     * Regista interesse de um utilizador num anúncio.
     *
     * O controller recebe o id do anúncio e o DTO com a mensagem/tipo de interesse.
     * O service valida se o anúncio está ativo, publicado e se o utilizador não é o dono.
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
     * Lista os interessados de um anúncio.
     *
     * Embora várias roles possam chamar a rota, o service valida a regra de owner:
     * apenas o dono do anúncio ou a moderação podem consultar esta informação.
     */
    @Roles(...TODAS_AS_ROLES_MARKETPLACE)
    @Get('anuncios/:id/interesses')
    listarInteressesDoAnuncio(
        @Param('id') idArtigo: string,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.listarInteressesDoAnuncio(+idArtigo, req.user);
    }
} 