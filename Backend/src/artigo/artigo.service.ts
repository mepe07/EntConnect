import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';

@Injectable()
export class ArtigoService {
    constructor(private prisma: PrismaService) { }

    // ============================================================================
    // 1. O INVENTÁRIO DA ESCOLA 
    // ============================================================================
    async listarInventario() {
        return this.prisma.artigo.findMany({
            where: {
                OR: [
                    { ID_Coordenador: { not: null } },
                    { ID_Direcao: { not: null } }
                ]
            },
            include: { Anuncios: true }
        });
    }

    // ============================================================================
    // 2. O BOTÃO MÁGICO 
    // ============================================================================
    async publicarNoMarketplace(idArtigo: number, quantidadeAVenda: number, notasAnuncio?: string) {
        const artigo = await this.prisma.artigo.findUnique({
            where: { ID_Artigo: idArtigo }
        });

        if (!artigo) throw new NotFoundException('Artigo não encontrado no armazém.');
        
        if (artigo.Quantidade < quantidadeAVenda) {
            throw new BadRequestException(`Stock insuficiente. Apenas tens ${artigo.Quantidade} unidades.`);
        }

        return this.prisma.anuncio_Marketplace.create({
            data: {
                ID_Artigo: idArtigo,
                Quantidade_A_Venda: quantidadeAVenda,
                Notas_Anuncio: notasAnuncio,
                Estado: 'Disponível'
            }
        });
    }

    // ============================================================================
    // 3. A MONTRA DO MARKETPLACE 
    // ============================================================================
    async listarMarketplace() {
        return this.prisma.anuncio_Marketplace.findMany({
            where: { Estado: 'Disponível' },
            include: {
                Artigo: {
                    include: {
                        Professor: { include: { Pessoa: true } },
                        Coordenador: { include: { Pessoa: true } },
                        Enc_Educacao: { include: { Pessoa: true } }
                    }
                }
            },
            orderBy: { Data_Criacao: 'desc' }
        });
    }
    // ============================================================================
    // 0. CRIAR NOVO ARTIGO (A tua correção de Sénior)
    // ============================================================================
    async criar(data: CreateArtigoDto) {
        return this.prisma.artigo.create({ 
            // O Prisma aceita o nosso DTO porque as propriedades 
            // (Nome, Quantidade, Notas) batem certo com a Base de Dados
            data: data 
        });
    }
} 