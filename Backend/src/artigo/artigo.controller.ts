// Ficheiro: src/artigo/artigo.controller.ts

import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request, UnauthorizedException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtigoService } from './artigo.service';
import { PublicarAnuncioDto } from './dto/publicar-anuncio.dto';
import { CreateArtigoDto } from './dto/create-artigo.dto';
import { AuthGuard } from '../auth/auth.guard';

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
    publicarNoMarketplace(@Param('id') idArtigo: string, @Body() publicarDto: PublicarAnuncioDto) {
        // Agora passamos as DUAS quantidades para o Service!
        return this.artigoService.publicarNoMarketplace(
            +idArtigo, 
            publicarDto.Quantidade_A_Venda, 
            publicarDto.Quantidade_Para_Alugar, 
            publicarDto.Notas_Anuncio
        );
    }

    // ============================================================================
    // CRIAR ARTIGO (COM UPLOAD DE IMAGEM)
    // ============================================================================
    @Post()
    @UseInterceptors(FileInterceptor('foto'))
    async criarArtigo(
        @Body() createDto: CreateArtigoDto, 
        @Request() req,
        @UploadedFile() file?: any
    ) {
        const userId = req.user.sub;
        const userRole = req.user.role;

        // Distribuição inteligente de responsabilidade
        if (userRole === 'Coordenador') createDto.ID_Coordenador = userId;
        else if (userRole === 'Direcao') createDto.ID_Direcao = userId;
        else if (userRole === 'Professor') createDto.ID_Professor = userId;
        else if (userRole === 'Enc_Educacao') createDto.ID_Enc_Educacao = userId;

        // Se o utilizador enviou uma foto, tratamos dela na Azure
        if (file) {
            const nomeUnico = `${Date.now()}-${file.originalname}`;
            const linkAzure = await this.artigoService.guardarFotosMarketplace('marketplace', nomeUnico, file);
            createDto.Foto = linkAzure; 
        }

        return this.artigoService.criar(createDto);
    }

    @Post(':id/favorito')
    toggleFavorito(@Param('id') idStock: string, @Request() req) {
        return this.artigoService.toggleFavorito(+idStock, req.user.sub);
    }

    @Post(':id/interesse')
    registarInteresse(@Param('id') idStock: string, @Body() body: { mensagem?: string }, @Request() req) {
        return this.artigoService.registarInteresse(+idStock, req.user.sub, body.mensagem);
    }

    @Get('meus-anuncios')
    listarMeusAnuncios(@Request() req) {
        return this.artigoService.listarMeusAnuncios(req.user.sub, req.user.role);
    }

    @Get('meus-pedidos')
    listarMeusPedidos(@Request() req) {
        return this.artigoService.listarMeusPedidos(req.user.sub);
    }

    // ============================================================================
    // 7. ALUGUERES: Pedir uma peça emprestada (Saída)
    // ============================================================================
    @Post(':id/alugar')
    registarAluguer(
        @Param('id') idStock: string, 
        @Body() body: { data_recolha_prevista: string }, // O React envia a data aqui dentro
        @Request() req
    ) {
        // A segurança não dorme: Extraímos o ID de quem fez login
        const userId = req.user.sub; 

        // Validação imediata de entrada de dados
        if (!body.data_recolha_prevista) {
            throw new BadRequestException('Tens de indicar obrigatoriamente a data em que vais devolver o artigo.');
        }
        
        // Passamos a bola ao Service
        return this.artigoService.alugarArtigo(+idStock, userId, body.data_recolha_prevista);
    }

    // ============================================================================
    // 8. ALUGUERES: Devolver uma peça (Entrada)
    // ============================================================================
    // Nota: Aqui não usamos o :id da prateleira, mas sim o ID do Aluguer em si!
    @Post('aluguer/:idAluguer/devolver')
    devolverAluguer(
        @Param('idAluguer') idAluguer: string, 
        @Request() req
    ) {
        // O cargo do utilizador (útil se quisermos barrar devoluções a alunos no futuro)
        const userRole = req.user.role;
        
        /* Opcional: Se só a Coordenação puder registar devoluções:
        if (userRole !== 'Coordenador' && userRole !== 'Direcao') {
            throw new UnauthorizedException('Apenas a secretaria pode aceitar devoluções.');
        }
        */

        return this.artigoService.devolverArtigo(+idAluguer);
    }
} 