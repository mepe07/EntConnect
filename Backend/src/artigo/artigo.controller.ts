// Ficheiro: src/artigo/artigo.controller.ts
import { Controller, Post ,Get, Patch, Param, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ArtigoService } from './artigo.service';
import { PublicarAnuncioDto } from './dto/publicar-anuncio.dto';
import { AuthGuard } from '../auth/auth.guard'; // Importa o nosso Segurança!
import { CreateArtigoDto } from './dto/create-artigo.dto';

@UseGuards(AuthGuard) // <--- MAGIA: Tranca o controlador todo! Ninguém entra sem Token.
@Controller('artigo') 
export class ArtigoController {
  
    constructor(private readonly artigoService: ArtigoService) { }

    @Get('inventario')
    listarInventario(@Request() req) {
        // O Segurança guardou a info do utilizador no 'req.user'
        const userRole = req.user.role; 

        // Uma pequena proteção extra: Só a Direção e os Coordenadores podem ver o Armazém
        if (userRole !== 'Coordenador' && userRole !== 'Direcao') {
            throw new UnauthorizedException('Apenas a Coordenação tem acesso ao Inventário.');
        }

        return this.artigoService.listarInventario();
    }

    @Get('marketplace')
    listarMarketplace() {
        // Aqui não precisamos de validar a Role. 
        // Como tem o AuthGuard no topo do ficheiro, sabemos que só malta com login da escola é que vê a montra.
        return this.artigoService.listarMarketplace();
    }

    @Patch(':id/publicar')
    publicarNoMarketplace(
    @Param('id') idArtigo: string, 
        @Body() publicarDto: PublicarAnuncioDto,
        @Request() req
    ) {
        // Tal como no inventário, podes usar o req.user.role se quiseres limitar 
        // quem carrega no "Botão Mágico" (embora, no futuro, os professores também devam poder vender).
        return this.artigoService.publicarNoMarketplace(
            +idArtigo, 
            publicarDto.Quantidade_A_Venda, 
            publicarDto.Notas_Anuncio
        );
    }
    @Post()
    criarArtigo(@Body() createDto: CreateArtigoDto, @Request() req) {
        // Vamos injetar o ID do utilizador que vem no Token (sub) 
        // na Role certa de acordo com o cargo dele
        const userId = req.user.sub;
        const userRole = req.user.role;

        if (userRole === 'Coordenador') createDto.ID_Coordenador = userId;
        if (userRole === 'Direcao') createDto.ID_Direcao = userId;
    
        return this.artigoService.criar(createDto);
    }
} 