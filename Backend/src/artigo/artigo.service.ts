import { Injectable, NotFoundException, BadRequestException, } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';

@Injectable()
export class ArtigoService {
    constructor(private prisma: PrismaService, private blobsService: BlobsService) { }
    // ============================================================================
    // 1. CRIAR NOVO ARTIGO + LOTE DE STOCK
    // ============================================================================
async criar(data: CreateArtigoDto) {
  // 1. Desestruturamos para facilitar a leitura e uso
  const {
    Nome, Notas, Foto, ID_Coordenador, ID_Direcao, ID_Professor, ID_Enc_Educacao,
    Quantidade_Total, Quantidade_Venda, Quantidade_Aluguer,
    ID_Cor, ID_Estado, ID_Tamanho
  } = data;

  // 2. Validação simples de integridade de dados (opcional mas recomendada)
  if (Quantidade_Venda + Quantidade_Aluguer > Quantidade_Total) {
    throw new Error('A soma de venda e aluguer não pode ser superior ao stock total.');
  }

  try {
    return await this.prisma.artigo.create({
      data: {
        // Dados do Artigo [cite: 46, 49, 51, 53]
        Nome,
        Notas,
        Foto,
        ID_Coordenador,
        ID_Direcao,
        ID_Professor,
        ID_Enc_Educacao,

        // Criação aninhada do Stock_Armazem [cite: 65, 366]
        Stock_Armazem: {
          create: {
            Quantidade_Total,
            Quantidade_Venda,
            Quantidade_Aluguer,
            ID_Cor,
            ID_Estado,
            ID_Tamanho,
          },
        },
      },
      // Incluímos o retorno do stock para confirmar que a ligação foi feita
      include: {
        Stock_Armazem: true,
      },
    });
}   catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Erro ao criar artigo: ${mensagem}`);
}
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
    // ============================================================================
    // 7. A PONTE PARA O AZURE (Reencaminha para o BlobsService)
    // ============================================================================
    async guardarFotosMarketplace(containerName: string, nomePersonalizado: string, file: any) {
        // Como o BlobsService já está injetado no construtor, 
        // só temos de lhe passar a encomenda para as mãos!
        return this.blobsService.guardarFotosMarketplace(containerName, nomePersonalizado, file);
    }
    // 8. LISTAR APENAS OS MEUS ANÚNCIOS (Dono)
    async listarMeusAnuncios(userId: number, role: string) {
        // Criamos o filtro dinâmico consoante o cargo
        const filtro: any = {};
        if (role === 'Coordenador') filtro.ID_Coordenador = userId;
        else if (role === 'Direcao') filtro.ID_Direcao = userId;
        else if (role === 'Professor') filtro.ID_Professor = userId;
        else if (role === 'Enc_Educacao') filtro.ID_Enc_Educacao = userId;

        return this.prisma.artigo.findMany({
            where: filtro,
            include: { Stock_Armazem: true }
        });
    }

    // 9. LISTAR OS MEUS PEDIDOS (Interesses enviados)
    async listarMeusPedidos(userId: number) {
        return this.prisma.interesse_Artigo.findMany({
            where: { ID_Utilizador: userId },
            include: {
                Stock_Armazem: {
                    include: { Artigo: true }
                }
            }
        });
    }
} 