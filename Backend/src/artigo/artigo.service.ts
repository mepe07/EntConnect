// Ficheiro: src/artigo/artigo.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateArtigoDto } from './dto/create-artigo.dto';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service'; // Ajusta o path se necessário

@Injectable()
export class ArtigoService {
    constructor(private prisma: PrismaService, private blobsService: BlobsService) { }

    // ============================================================================
    // 1. CRIAR NOVO ARTIGO + LOTE DE STOCK
    // ============================================================================
    async criar(data: CreateArtigoDto) {
        return this.prisma.artigo.create({
            data: {
                Nome: data.Nome,
                Notas: data.Notas,
                Foto: data.Foto,
                ID_Coordenador: data.ID_Coordenador,
                ID_Direcao: data.ID_Direcao,
                ID_Professor: data.ID_Professor,
                ID_Enc_Educacao: data.ID_Enc_Educacao,
                
                // Magia: Criamos a Prateleira logo a seguir!
                Stock_Armazem: {
                    create: {
                        Quantidade_Total: data.Quantidade_Total,
                        Quantidade_Venda: data.Quantidade_Venda,
                        Quantidade_Aluguer: data.Quantidade_Aluguer,
                        // 👉 Incluímos as tabelas auxiliares que vieram do React!
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
            include: { 
                Stock_Armazem: {
                    include: { Cor: true, Estado: true, Tamanho: true }
                } 
            }
        });
    }

    // ============================================================================
    // 3. ATUALIZAR LOTE PARA O MARKETPLACE
    // ============================================================================
    async publicarNoMarketplace(idStock: number, quantidadeAVenda: number, quantidadeParaAlugar: number, notasAnuncio?: string) {
        const loteFisico = await this.prisma.stock_Armazem.findUnique({
            where: { ID_Stock: idStock }
        });

        if (!loteFisico) throw new NotFoundException('Lote não encontrado no armazém.');
        
        // Regra de Ouro: A soma do que vai para venda + aluguer não pode exceder o total físico na prateleira!
        if (loteFisico.Quantidade_Total < (quantidadeAVenda + quantidadeParaAlugar)) {
            throw new BadRequestException(`Stock físico insuficiente. Apenas tens ${loteFisico.Quantidade_Total} unidades físicas e estás a tentar alocar ${quantidadeAVenda + quantidadeParaAlugar}.`);
        }

        return this.prisma.stock_Armazem.update({
            where: { ID_Stock: idStock },
            data: { 
                Quantidade_Venda: quantidadeAVenda,
                Quantidade_Aluguer: quantidadeParaAlugar
                // (Opcional) Se quiseres guardar a nota, precisas de ter esse campo no Prisma
            }
        });
    }

    // ============================================================================
    // 4. A MONTRA DO MARKETPLACE
    // ============================================================================
    async listarMarketplace() {
        return this.prisma.stock_Armazem.findMany({
            where: { 
                // A MAGIA ACONTECE AQUI: Traz se houver Venda OU Aluguer!
                OR: [
                    { Quantidade_Venda: { gt: 0 } },
                    { Quantidade_Aluguer: { gt: 0 } }
                ]
            },
            include: {
                Artigo: {
                    include: {
                        Professor: { include: { Pessoa: true } },
                        Coordenador: { include: { Pessoa: true } },
                        Enc_Educacao: { include: { Pessoa: true } },
                        Direcao: { include: { Pessoa: true } }
                    }
                },
                Cor: true, Estado: true, Tamanho: true
            }
        });
    }

    // ============================================================================
    // 5. SISTEMA DE FAVORITOS
    // ============================================================================
    async toggleFavorito(idStock: number, idUtilizador: number) {
        const favoritoExistente = await this.prisma.artigo_Favorito.findUnique({
            where: {
                ID_Utilizador_ID_Stock: { ID_Utilizador: idUtilizador, ID_Stock: idStock }
            }
        });

        if (favoritoExistente) {
            await this.prisma.artigo_Favorito.delete({
                where: { ID_Favorito: favoritoExistente.ID_Favorito }
            });
            return { mensagem: 'Removido dos favoritos', status: 'removido' };
        }

        await this.prisma.artigo_Favorito.create({
            data: { ID_Utilizador: idUtilizador, ID_Stock: idStock }
        });
        return { mensagem: 'Adicionado aos favoritos', status: 'adicionado' };
    }

    // ============================================================================
    // 6. SISTEMA DE INTENÇÕES
    // ============================================================================
    async registarInteresse(idStock: number, idUtilizador: number, mensagemTexto?: string) {
        const loteFisico = await this.prisma.stock_Armazem.findUnique({
            where: { ID_Stock: idStock }
        });

        if (!loteFisico || loteFisico.Quantidade_Venda <= 0) {
            throw new BadRequestException('Lamentamos, mas este artigo já não está disponível na montra.');
        }

        const novoInteresse = await this.prisma.interesse_Artigo.create({
            data: {
                ID_Utilizador: idUtilizador,
                ID_Stock: idStock,
                Mensagem: mensagemTexto,
                Estado: 'Pendente'
            }
        });

        return { 
            mensagem: 'Interesse registado com sucesso!',
            pedido: novoInteresse 
        };
    }

    // ============================================================================
    // 7. A PONTE PARA O AZURE
    // ============================================================================
    async guardarFotosMarketplace(containerName: string, nomePersonalizado: string, file: any) {
        return this.blobsService.guardarFotosMarketplace(containerName, nomePersonalizado, file);
    }

    // ============================================================================
    // 8. LISTAR APENAS OS MEUS ANÚNCIOS
    // ============================================================================
    async listarMeusAnuncios(userId: number, role: string) {
        const filtro: any = {};
        if (role === 'Coordenador') filtro.ID_Coordenador = userId;
        else if (role === 'Direcao') filtro.ID_Direcao = userId;
        else if (role === 'Professor') filtro.ID_Professor = userId;
        else if (role === 'Enc_Educacao') filtro.ID_Enc_Educacao = userId;

        return this.prisma.artigo.findMany({
            where: filtro,
            include: { Stock_Armazem: { include: { Cor: true, Estado: true, Tamanho: true } } }
        });
    }

    // ============================================================================
    // 9. LISTAR OS MEUS PEDIDOS
    // ============================================================================
    async listarMeusPedidos(userId: number) {
        return this.prisma.interesse_Artigo.findMany({
            where: { ID_Utilizador: userId },
            include: {
                Stock_Armazem: { include: { Artigo: true, Cor: true, Estado: true, Tamanho: true } }
            }
        });
    }
    
    // ============================================================================
    // 10. SISTEMA DE ALUGUER / EMPRÉSTIMO (A SAÍDA)
    // ============================================================================
    /**
     * Regista a saída de um artigo do armazém para um utilizador.
     * @param idStock ID da prateleira (lote) de onde sai a peça
     * @param idUtilizador ID de quem está a levar a peça
     * @param dataRecolhaPrevistaStr Data em formato de texto (YYYY-MM-DD) enviada pelo Frontend
     */
    async alugarArtigo(idStock: number, idUtilizador: number, dataRecolhaPrevistaStr: string) {
        // 1. Verificamos se o lote físico existe no armazém
        const loteFisico = await this.prisma.stock_Armazem.findUnique({
            where: { ID_Stock: idStock }
        });

        // Prevenção de erros: Se a prateleira não existe, barramos a operação
        if (!loteFisico) {
            throw new BadRequestException('Lamentamos, mas esta prateleira não existe ou foi removida.');
        }

        // Prevenção de negócio: Apenas permitimos aluguer se a quantidade destinada a aluguer for maior que 0
        if (loteFisico.Quantidade_Aluguer <= 0) {
            throw new BadRequestException('Este artigo não tem unidades disponíveis para aluguer de momento.');
        }

        // 2. Tradução de Dados: O JavaScript recebe a data em texto, temos de a converter num Objeto Data real
        const dataPrevista = new Date(dataRecolhaPrevistaStr);

        // Prevenção de negócio: Não faz sentido entregar ontem
        if (dataPrevista < new Date()) {
            throw new BadRequestException('A data de devolução prevista não pode ser no passado.');
        }

        // 3. Registamos o empréstimo no nosso "livro de ponto" (Tabela Aluguer_Artigo)
        const novoAluguer = await this.prisma.aluguer_Artigo.create({
            data: {
                ID_Stock: idStock,
                ID_Utilizador: idUtilizador,
                Data_Recolha_Prevista: dataPrevista,
                Estado: 'Ativo' // A peça saiu e está ativamente nas mãos de alguém
            }
        });

        return {
            mensagem: 'Reserva de aluguer registada com sucesso!',
            aluguer: novoAluguer
        };
    }

    // ============================================================================
    // 11. SISTEMA DE ALUGUER / EMPRÉSTIMO (O REGRESSO)
    // ============================================================================
    /**
     * Regista a devolução de um artigo que estava alugado.
     * @param idAluguer ID único do registo de aluguer
     */
    async devolverArtigo(idAluguer: number) {
        // 1. Procuramos o registo do aluguer
        const aluguerAtual = await this.prisma.aluguer_Artigo.findUnique({
            where: { ID_Aluguer: idAluguer }
        });

        if (!aluguerAtual) {
            throw new NotFoundException('Registo de aluguer não encontrado.');
        }

        if (aluguerAtual.Estado === 'Devolvido') {
            throw new BadRequestException('Esta peça já foi devolvida anteriormente. Não a podes devolver duas vezes!');
        }

        // 2. Fechamos o ciclo: Atualizamos o estado e carimbamos a data de hoje como a data de entrega real
        const aluguerAtualizado = await this.prisma.aluguer_Artigo.update({
            where: { ID_Aluguer: idAluguer },
            data: {
                Estado: 'Devolvido',
                Data_Recolha_Efetiva: new Date() // O relógio do servidor carimba o momento exato do regresso
            }
        });

        return {
            mensagem: 'Peça devolvida com sucesso! O armazém agradece.',
            aluguer: aluguerAtualizado
        };
    }
} 