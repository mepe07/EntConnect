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
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
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


@UseGuards(AuthGuard)
@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) {}

    @Get('anuncios')
    listarAnuncios(@Query() filtros: ListarAnunciosMarketplaceDto) {
        return this.marketplaceService.listarAnuncios(filtros);
    }

    @Get('anuncios/:id')
    obterAnuncio(@Param('id') idArtigo: string) {
        return this.marketplaceService.obterAnuncio(+idArtigo);
    }

    @Get('meus-anuncios')
    listarMeusAnuncios(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarMeusAnuncios(req.user);
    }

    @Get('inventario-escola')
    listarInventarioDaEscola(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarInventarioDaEscola(req.user);
    }

    @Get('inventario-escola/disponivel-para-publicacao')
    listarInventarioDisponivelParaPublicacao(@Request() req: { user: UtilizadorAutenticado }) {
        return this.marketplaceService.listarInventarioDisponivelParaPublicacao(req.user);
    }

    @Post('anuncios')
    @UseInterceptors(FileInterceptor('foto')) // Interceta o campo 'foto' do FormData
    criarAnuncio(
        @Body() dto: CriarAnuncioMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
        @UploadedFile() file?: Express.Multer.File, // Recebe o ficheiro físico
    ) {
        // Passamos o ficheiro para o serviço processar e enviar para o Azure
        return this.marketplaceService.criarAnuncio(dto, req.user, file);
    }

    @Post('inventario-escola/publicar')
    publicarInventarioDaEscola(
        @Body() dto: PublicarInventarioEscolaDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.publicarInventarioDaEscola(dto, req.user);
    }

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

    @Patch('anuncios/:id/estado')
    alterarEstado(
        @Param('id') idArtigo: string,
        @Body() dto: AlterarEstadoAnuncioDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.alterarEstado(+idArtigo, dto, req.user);
    }

    @Delete('anuncios/:id')
    removerAnuncio(
        @Param('id') idArtigo: string,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.removerAnuncio(+idArtigo, req.user);
    }

    @Post('anuncios/:id/moderar')
    moderarAnuncio(
        @Param('id') idArtigo: string,
        @Body() dto: ModerarAnuncioMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.moderarAnuncio(+idArtigo, dto, req.user);
    }

    @Post('anuncios/:id/interesse')
    registarInteresse(
        @Param('id') idArtigo: string,
        @Body() dto: RegistarInteresseMarketplaceDto,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.registarInteresse(+idArtigo, dto, req.user);
    }

    @Get('anuncios/:id/interesses')
    listarInteressesDoAnuncio(
        @Param('id') idArtigo: string,
        @Request() req: { user: UtilizadorAutenticado },
    ) {
        return this.marketplaceService.listarInteressesDoAnuncio(+idArtigo, req.user);
    }

    @Post('inventario')
    @UseInterceptors(FileInterceptor('foto')) // Este 'foto' tem de bater certo com o formData.append('foto', ...) do Frontend!
    criarItemInventario(
        @Body() dto: CriarItemInventarioDto,
        @Request() req: { user: UtilizadorAutenticado },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.marketplaceService.criarItemInventario(dto, req.user, file);
    }
}
