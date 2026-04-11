import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';

@Injectable()
export class ArtigoService {
    constructor(private prisma: PrismaService) { }

    // ============================================================================
    // 1. CRIAR NOVO ARTIGO + LOTE DE STOCK
    // ============================================================================
    async criar(data: CreateArtigoDto) {
        return this.prisma.artigo.create({
            data: {
                // Preenchemos o Catálogo
                Nome: data.Nome,
                Notas: data.Notas,
                Foto: data.Foto,
                ID_Coordenador: data.ID_Coordenador,
                ID_Direcao: data.ID_Direcao,
                
                // Magia: Criamos a Prateleira logo a seguir!
                Stock_Armazem: {
                    create: {
                        Quantidade_Total: data.Quantidade_Total,
                        Quantidade_Venda: data.Quantidade_Venda,
                        Quantidade_Aluguer: data.Quantidade_Aluguer,
                        ID_Cor: data.ID_Cor,
                        ID_Estado: data.ID_Estado,
                        ID_Tamanho: data.ID_Tamanho
                    }
                }
            }
        });
    }

    // ============================================================================
    // 2. LISTAR O NOVO INVENTÁRIO
    // ============================================================================
    async listarInventario() {
        return this.prisma.artigo.findMany({
            where: {
                OR: [
                    { ID_Coordenador: { not: null } },
                    { ID_Direcao: { not: null } }
                ]
            },
            // Trazemos o Stock e as características penduradas nele!
            include: { 
                Stock_Armazem: {
                    include: {
                        Cor: true,
                        Estado: true,
                        Tamanho: true
                    }
                } 
            }
        });
    }

    // ============================================================================
    // 3. O BOTÃO MÁGICO (Atualizar o Lote para Venda)
    // ============================================================================
    // Atenção: Agora recebemos o ID do Stock (A Prateleira) e não o ID do Artigo!
    async publicarNoMarketplace(idStock: number, quantidadeAVenda: number, notasAnuncio?: string) {
        // 1. Vamos ver se o lote físico existe
        const loteFisico = await this.prisma.stock_Armazem.findUnique({
            where: { ID_Stock: idStock }
        });

        if (!loteFisico) {
            throw new NotFoundException('Lote não encontrado no armazém.');
        }
        
        // 2. O controlo de segurança: Não podes vender o que não tens!
        if (loteFisico.Quantidade_Total < quantidadeAVenda) {
            throw new BadRequestException(`Stock físico insuficiente. Apenas tens ${loteFisico.Quantidade_Total} unidades físicas.`);
        }

        // 3. A atualização mágica. 
        // Opcional: Se quiseres guardar as 'notasAnuncio', terias de adicionar 
        // um campo 'Notas_Venda' no teu Stock_Armazem. Por agora, atualizamos só a quantidade.
        return this.prisma.stock_Armazem.update({
            where: { ID_Stock: idStock },
            data: {
                Quantidade_Venda: quantidadeAVenda
            }
        });
    }

    // ============================================================================
    // 4. A MONTRA DO MARKETPLACE (A Loja Pública)
    // ============================================================================
    async listarMarketplace() {
        // O Prisma vai varrer o armazém à procura de coisas à venda
        return this.prisma.stock_Armazem.findMany({
            where: { 
                Quantidade_Venda: { gt: 0 } // gt significa "Greater Than" (Maior que 0)
            },
            include: {
                // Trazemos os detalhes do catálogo (Nome, Foto)
                Artigo: {
                    include: {
                        Professor: { include: { Pessoa: true } },
                        Coordenador: { include: { Pessoa: true } },
                        Enc_Educacao: { include: { Pessoa: true } },
                        Direcao: { include: { Pessoa: true } }
                    }
                },
                // Trazemos as características físicas do Lote à venda
                Cor: true,
                Estado: true,
                Tamanho: true
            }
            // Retirado o orderBy temporariamente porque 'Data_Criacao' 
            // já não existe no Stock_Armazem. Podes adicionar um campo se precisares.
        });
    }
    // ============================================================================
    // 5. SISTEMA DE FAVORITOS (O Interruptor)
    // ============================================================================
    async toggleFavorito(idStock: number, idUtilizador: number) {
        // 1. Vamos ver se o coração já lá está
        const favoritoExistente = await this.prisma.artigo_Favorito.findUnique({
            where: {
                ID_Utilizador_ID_Stock: { // A nossa chave única composta!
                    ID_Utilizador: idUtilizador,
                    ID_Stock: idStock
                }
            }
        });

        // 2. Se já existe, o utilizador quer remover dos favoritos
        if (favoritoExistente) {
            await this.prisma.artigo_Favorito.delete({
                where: { ID_Favorito: favoritoExistente.ID_Favorito }
            });
            return { mensagem: 'Removido dos favoritos', status: 'removido' };
        }

        // 3. Se não existe, o utilizador quer adicionar aos favoritos
        await this.prisma.artigo_Favorito.create({
            data: {
                ID_Utilizador: idUtilizador,
                ID_Stock: idStock
            }
        });
        return { mensagem: 'Adicionado aos favoritos', status: 'adicionado' };
    }

    // ============================================================================
    // 6. SISTEMA DE INTENÇÕES (A Proposta de Negócio)
    // ============================================================================
    async registarInteresse(idStock: number, idUtilizador: number, mensagemTexto?: string) {
        // 1. Verificamos se a prateleira ainda existe e tem unidades à venda
        const loteFisico = await this.prisma.stock_Armazem.findUnique({
            where: { ID_Stock: idStock }
        });

        if (!loteFisico || loteFisico.Quantidade_Venda <= 0) {
            throw new BadRequestException('Lamentamos, mas este artigo já não está disponível na montra.');
        }

        // 2. Registamos a intenção sem mexer no stock físico!
        const novoInteresse = await this.prisma.interesse_Artigo.create({
            data: {
                ID_Utilizador: idUtilizador,
                ID_Stock: idStock,
                Mensagem: mensagemTexto,
                Estado: 'Pendente' // Fica à espera que a Direção aprove
            }
        });

        return { 
            mensagem: 'Interesse registado com sucesso! A Direção irá analisar o pedido.',
            pedido: novoInteresse 
        };
    }
} 