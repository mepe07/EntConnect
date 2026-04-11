// Ficheiro: src/artigo/artigo.controller.ts
import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request, UnauthorizedException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ArtigoService } from './artigo.service';
import { PublicarAnuncioDto } from './dto/publicar-anuncio.dto';
import { AuthGuard } from '../auth/auth.guard'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard) 
@Controller('artigo') 
export class ArtigoController {
  
    constructor(private readonly artigoService: ArtigoService) { }

    @Get('inventario')
    listarInventario(@Request() req) {
        const userRole = req.user.role; 

        if (userRole !== 'Coordenador' && userRole !== 'Direcao') {
            throw new UnauthorizedException('Apenas a Coordenação tem acesso ao Inventário.');
        }

        return this.artigoService.listarInventario();
    }

    @Get('marketplace')
    listarMarketplace() {
        return this.artigoService.listarMarketplace();
    }

    @Patch(':id/publicar')
    publicarNoMarketplace(
        @Param('id') idArtigo: string, 
        @Body() publicarDto: PublicarAnuncioDto,
        @Request() req
    ) {
        return this.artigoService.publicarNoMarketplace(
            +idArtigo, 
            publicarDto.Quantidade_A_Venda, 
            publicarDto.Notas_Anuncio
        );
    }

    /*
    *   funcao criarArtigo: Esta função é o coração do processo de criação de um novo artigo. 
    * Ela recebe os dados do formulário (CreateArtigoDto) e a foto (se houver), e faz a magia acontecer:
    */

    @Post()
    @UseInterceptors(FileInterceptor('foto'))
    async criarArtigo(
        @Body() createDto: CreateArtigoDto, 
        @Request() req,
        @UploadedFile() file?: Express.Multer.File
    ) {
        // Apanhamos quem está a criar o artigo
        const userId = req.user.sub;
        const userRole = req.user.role;

        // 👉 DISTRIBUIÇÃO INTELIGENTE: Guarda o ID no campo correto consoante o cargo
        if (userRole === 'Coordenador') createDto.ID_Coordenador = userId;
        else if (userRole === 'Direcao') createDto.ID_Direcao = userId;
        else if (userRole === 'Professor') createDto.ID_Professor = userId;
        else if (userRole === 'Enc_Educacao') createDto.ID_Enc_Educacao = userId;

        // A MAGIA DA FOTO
        if (file) {
            const nomeUnico = `${Date.now()}-${file.originalname}`;
            const linkAzure = await this.artigoService.guardarFotosMarketplace('marketplace', nomeUnico, file);
            createDto.Foto = linkAzure; 
        }

        return this.artigoService.criar(createDto);
    }

    // ============================================================================
    // 5. FAVORITOS: Alternar o Coração (On/Off)
    // ============================================================================
    @Post(':id/favorito')
    toggleFavorito(@Param('id') idStock: string, @Request() req) {
        // A magia do AuthGuard: Extraímos o ID de quem clicou no coração!
        const userId = req.user.sub; 
        
        return this.artigoService.toggleFavorito(+idStock, userId);
    }

    // ============================================================================
    // 6. INTERESSES: Fazer um Pedido (A intenção de negócio)
    // ============================================================================
    @Post(':id/interesse')
    registarInteresse(
        @Param('id') idStock: string, 
        @Body() body: { mensagem?: string }, // O corpo pode trazer uma justificação
        @Request() req
    ) {
        // Quem está a pedir o artigo?
        const userId = req.user.sub; 
        
        return this.artigoService.registarInteresse(+idStock, userId, body.mensagem);
    }

    @Get('meus-anuncios')
    listarMeusAnuncios(@Request() req) {
        return this.artigoService.listarMeusAnuncios(req.user.sub, req.user.role);
    }

    @Get('meus-pedidos')
    listarMeusPedidos(@Request() req) {
        return this.artigoService.listarMeusPedidos(req.user.sub);
    }
} 