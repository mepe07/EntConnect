// Ficheiro: src/artigo/artigo.controller.ts
import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ArtigoService } from './artigo.service';
import { PublicarAnuncioDto } from './dto/publicar-anuncio.dto';
import { AuthGuard } from '../auth/auth.guard'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';

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

    @Post()
    criarArtigo(@Body() createDto: CreateArtigoDto, @Request() req) {
        const userId = req.user.sub;
        const userRole = req.user.role;

        if (userRole === 'Coordenador') createDto.ID_Coordenador = userId;
        if (userRole === 'Direcao') createDto.ID_Direcao = userId;
    
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
} 