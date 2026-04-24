// Ficheiro: Backend/src/marketplace/marketplace.service.ts

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAnuncioMarketplaceDto } from './dto/criar-anuncio-marketplace.dto';
import { CriarItemInventarioDto } from './dto/criar-item-inventario.dto';
import { AtualizarAnuncioMarketplaceDto } from './dto/atualizar-anuncio-marketplace.dto';
import { AlterarEstadoAnuncioDto } from './dto/alterar-estado-anuncio.dto';
import { ModerarAnuncioMarketplaceDto } from './dto/moderar-anuncio-marketplace.dto';
import { PublicarInventarioEscolaDto } from './dto/publicar-inventario-escola.dto';
import { RegistarInteresseMarketplaceDto } from './dto/registar-interesse-marketplace.dto';
import { ListarAnunciosMarketplaceDto } from './dto/listar-anuncios-marketplace.dto';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { EstadoAnuncio } from './enums/estado-anuncio.enum';
import { TipoAnuncio } from './enums/tipo-anuncio.enum';
import { OrigemRegisto } from './enums/origem-registo.enum';
import { TipoInteresse } from './enums/tipo-interesse.enum';
import { AcaoModeracao } from './enums/acao-moderacao.enum';
import {
    garantirAcessoAoInventarioDaEscola,
    garantirPermissaoDeModeracao,
    podeModerarMarketplace,
} from './marketplace.permissoes';

/**
 * Serviço do Marketplace orientado para a nova arquitetura.
 *
 * Decisões desta versão:
 * - o módulo chama-se Marketplace;
 * - a tabela física principal continua a ser `Artigo`;
 * - não é criada uma tabela `Marketplace_Anuncio`;
 * - o dono canónico do anúncio é `ID_Utilizador_Criador`;
 * - o legado por role no `Artigo` foi removido deste módulo;
 * - o inventário da escola passa a ser gerido por permissão (`Coordenador`) e não por colunas separadas.
 *
 * Nota técnica importante:
 * enquanto não correres `prisma generate` com o schema atualizado, o cliente Prisma local
 * não vai refletir automaticamente o novo contrato. Por isso, neste pacote o acesso ao
 * Prisma foi mantido via `any` em alguns pontos para te deixar integrar e refatorar em casa.
 */
@Injectable()
export class MarketplaceService {
    constructor(
        private readonly prisma: PrismaService, 
        private readonly blobsService: BlobsService
    ) 
    { }


    // ========================================================================
    // 1. CONSULTA PÚBLICA
    // ========================================================================

    async listarAnuncios(filtros: ListarAnunciosMarketplaceDto) {
        const prisma = this.prisma as any;
        const where: any = {
            Publicado_No_Marketplace: filtros.publicado ?? true,
            Estado_Anuncio:
                filtros.estado ?? {
                    in: [EstadoAnuncio.ATIVO],
                },
        };

        if (filtros.tipoAnuncio) {
            where.Tipo_Anuncio = filtros.tipoAnuncio;
        }

        if (filtros.origem) {
            where.Origem_Registo = filtros.origem;
        }

        if (filtros.idCriador) {
            where.ID_Utilizador_Criador = filtros.idCriador;
        }

        if (filtros.pesquisa?.trim()) {
            const pesquisa = filtros.pesquisa.trim();
            where.OR = [
                { Nome: { contains: pesquisa } },
                { Descricao: { contains: pesquisa } },
                { Notas: { contains: pesquisa } },
            ];
        }

        return prisma.artigo.findMany({
            where,
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    async obterAnuncio(idArtigo: number) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        return artigo;
    }

    async listarAnunciosModeracao(utilizador: UtilizadorAutenticado) {
        garantirPermissaoDeModeracao(utilizador.role);

        const prisma = this.prisma as any;

        return prisma.artigo.findMany({
            where: {
                Estado_Anuncio: {
                    in: [
                        EstadoAnuncio.ATIVO,
                        EstadoAnuncio.RESERVADO,
                        EstadoAnuncio.CONCLUIDO,
                        EstadoAnuncio.REMOVIDO,
                    ],
                },
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    async listarRegistoModeracao(utilizador: UtilizadorAutenticado) {
        garantirPermissaoDeModeracao(utilizador.role);

        const prisma = this.prisma as any;

        return prisma.registo_Moderacao_Marketplace.findMany({
            include: {
                Artigo: {
                    select: {
                        ID_Artigo: true,
                        Nome: true,
                        Foto: true,
                        Tipo_Anuncio: true,
                        Estado_Anuncio: true,
                        Origem_Registo: true,
                    },
                },
                Utilizador: {
                    include: {
                        Pessoa: true,
                    },
                },
            },
            orderBy: [
                { Data_Registo: 'desc' },
                { ID_Registo_Moderacao: 'desc' },
            ],
        });
    }

    async listarMeusAnuncios(utilizador: UtilizadorAutenticado) {
        const prisma = this.prisma as any;

        return prisma.artigo.findMany({
            where: {
                ID_Utilizador_Criador: utilizador.sub,
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    async listarInventarioDaEscola(utilizador: UtilizadorAutenticado) {
        // 1. Segurança: Apenas a Coordenadora passa daqui
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const prisma = this.prisma as any;

        // 2. Query limpa e focada na lógica de negócio
        return prisma.artigo.findMany({
            where: {
                // Traz TODOS os artigos cujo dono é a escola, ponto final.
                Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
            },
            include: this.includeBaseArtigo(),
            orderBy: [
                { Data_Atualizacao: 'desc' }, 
                { ID_Artigo: 'desc' }
            ],
        });
    }

    async listarInventarioDisponivelParaPublicacao(utilizador: UtilizadorAutenticado) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const prisma = this.prisma as any;

        return prisma.artigo.findMany({
            where: {
                Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
                Publicado_No_Marketplace: false,
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    // ========================================================================
    // 2. CRIAÇÃO E PUBLICAÇÃO
    // ========================================================================

    async criarAnuncio(dto: CriarAnuncioMarketplaceDto, utilizador: UtilizadorAutenticado, file?: Express.Multer.File) {
        let urlFoto: string | null = null;

        // Só entramos aqui se o utilizador realmente tiver enviado uma fotografia
        if (file) {

            // 1. Validação do Tipo de Ficheiro (O Porteiro da Extensão)
            const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;

            if (!extensoesPermitidas.test(file.mimetype)) {
                throw new BadRequestException(
                    `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`
                );
            }

            // 2. Validação do Tamanho (O Porteiro do Peso)
            const limiteMB = 10;
            const limiteBytes = limiteMB * 1024 * 1024;

            if (file.size > limiteBytes) {
                const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);

                throw new BadRequestException(
                    `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB.`
                );
            }

            // 3. Tudo válido? Então sim, gastamos recursos a guardar na Nuvem!
            const nomeFicheiro = `anuncio_${utilizador.sub}_${Date.now()}`;
            urlFoto = await this.blobsService.guardarFotosMarketplace('marketplace', nomeFicheiro, file);
        }

        // A partir daqui, a magia do Prisma continua exatamente igual...
        return this.prisma.$transaction(async (tx) => {
            const novoArtigo = await tx.artigo.create({
                data: {
                    Nome: dto.titulo,
                    Descricao: dto.descricao,
                    Notas: dto.notasInternas,
                    Foto: urlFoto, // Vai com o link da cloud, ou com null se não enviou foto
                    Tipo_Anuncio: dto.tipoAnuncio,
                    Origem_Registo: "utilizador",
                    Publicado_No_Marketplace: true,
                    Estado_Anuncio: "ativo",
                    ID_Utilizador_Criador: utilizador.sub,
                    Data_Criacao: new Date(),
                    Data_Atualizacao: new Date(),
                },
            });

            await tx.stock_Armazem.create({
                data: {
                    ID_Artigo: novoArtigo.ID_Artigo,
                    Quantidade_Total: dto.quantidadeTotal,
                    ID_Tamanho: dto.idTamanho ? Number(dto.idTamanho) : null,
                    ID_Estado: dto.idEstado ? Number(dto.idEstado) : null,
                },
            });

            return novoArtigo;
        });
    }

    async publicarInventarioDaEscola(
        dto: PublicarInventarioEscolaDto,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(dto.idArtigo);

        const dono = this.ehDonoDoAnuncio(artigo, utilizador);
        if (!dono) {
            throw new ForbiddenException('Este artigo do inventário não pertence à coordenadora autenticada.');
        }

        const stockPrincipal = this.obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O artigo do inventário não tem stock associado.');
        }

        const distribuicao = this.resolverDistribuicaoStock({
            tipoAnuncio: dto.tipoAnuncio,
            quantidadeDisponivel: dto.quantidadeDisponivel,
            quantidadeVenda: dto.quantidadeVenda,
            quantidadeAluguer: dto.quantidadeAluguer,
            quantidadeTotal: stockPrincipal.Quantidade_Total,
        });

        return prisma.$transaction(async (tx: any) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: {
                    Quantidade_Venda: distribuicao.quantidadeVenda,
                    Quantidade_Aluguer: distribuicao.quantidadeAluguer,
                },
            });

            return tx.artigo.update({
                where: { ID_Artigo: dto.idArtigo },
                data: {
                    Nome: dto.titulo ?? artigo.Nome,
                    Descricao: dto.descricao ?? artigo.Descricao ?? null,
                    Foto: dto.foto ?? artigo.Foto ?? null,
                    Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
                    Tipo_Anuncio: distribuicao.tipoAnuncio,
                    Estado_Anuncio: EstadoAnuncio.ATIVO,
                    Publicado_No_Marketplace: true,
                    Data_Atualizacao: new Date(),
                },
                include: this.includeBaseArtigo(),
            });
        });
    }

    // ========================================================================
    // 3. GESTÃO DO DONO
    // ========================================================================

    async atualizarAnuncio(
        idArtigo: number,
        dto: AtualizarAnuncioMarketplaceDto,
        utilizador: UtilizadorAutenticado,
        file?: Express.Multer.File,
    ) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        this.garantirAcessoAoAnuncio(artigo, utilizador);

        const stockPrincipal = this.obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O artigo não tem stock associado para atualizar.');
        }

        const quantidadeTotalFinal = dto.quantidadeTotal ?? stockPrincipal.Quantidade_Total;
        const tipoFinal = dto.tipoAnuncio ?? artigo.Tipo_Anuncio;

        const distribuicao = this.resolverDistribuicaoStock({
            tipoAnuncio: tipoFinal,
            quantidadeDisponivel: dto.quantidadeDisponivel,
            quantidadeVenda: dto.quantidadeVenda,
            quantidadeAluguer: dto.quantidadeAluguer,
            quantidadeTotal: quantidadeTotalFinal,
            quantidadeVendaAtual: stockPrincipal.Quantidade_Venda,
            quantidadeAluguerAtual: stockPrincipal.Quantidade_Aluguer,
            permitirManterDistribuicaoAtual: true,
        });

        let urlFotoFinal = dto.foto ?? artigo.Foto ?? null;

        if (file) {
            const nomeFicheiro = `anuncio_${idArtigo}_${Date.now()}`;
            urlFotoFinal = await this.blobsService.guardarFotosMarketplace('marketplace', nomeFicheiro, file);
        }

        return prisma.$transaction(async (tx: any) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: {
                    Quantidade_Total: quantidadeTotalFinal,
                    Quantidade_Venda: distribuicao.quantidadeVenda,
                    Quantidade_Aluguer: distribuicao.quantidadeAluguer,
                    ID_Cor: dto.idCor ?? stockPrincipal.ID_Cor ?? null,
                    ID_Estado: dto.idEstado ?? stockPrincipal.ID_Estado ?? null,
                    ID_Tamanho: dto.idTamanho ?? stockPrincipal.ID_Tamanho ?? null,
                },
            });

            return tx.artigo.update({
                where: { ID_Artigo: idArtigo },
                data: {
                    Nome: dto.titulo ?? artigo.Nome,
                    Descricao: dto.descricao ?? artigo.Descricao ?? null,
                    Foto: urlFotoFinal,
                    Notas: dto.notasInternas ?? artigo.Notas ?? null,
                    Tipo_Anuncio: distribuicao.tipoAnuncio,
                    Data_Atualizacao: new Date(),
                },
                include: this.includeBaseArtigo(),
            });
        });
    }

    async alterarEstado(
        idArtigo: number,
        dto: AlterarEstadoAnuncioDto,
        utilizador: UtilizadorAutenticado,
    ) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        this.garantirAcessoAoAnuncio(artigo, utilizador);
        this.validarTransicaoDeEstado(artigo.Estado_Anuncio, dto.estado, utilizador);

        return prisma.artigo.update({
            where: { ID_Artigo: idArtigo },
            data: {
                Estado_Anuncio: dto.estado,
                Publicado_No_Marketplace: dto.estado === EstadoAnuncio.ATIVO,
                Motivo_Moderacao:
                    dto.estado === EstadoAnuncio.REMOVIDO && podeModerarMarketplace(utilizador.role)
                        ? dto.motivo ?? artigo.Motivo_Moderacao ?? null
                        : artigo.Motivo_Moderacao ?? null,
                Data_Moderacao:
                    dto.estado === EstadoAnuncio.REMOVIDO && podeModerarMarketplace(utilizador.role)
                        ? new Date()
                        : artigo.Data_Moderacao ?? null,
                ID_Utilizador_Moderador:
                    dto.estado === EstadoAnuncio.REMOVIDO && podeModerarMarketplace(utilizador.role)
                        ? utilizador.sub
                        : artigo.ID_Utilizador_Moderador ?? null,
                Data_Atualizacao: new Date(),
            },
            include: this.includeBaseArtigo(),
        });
    }

    async removerAnuncio(idArtigo: number, utilizador: UtilizadorAutenticado) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        if (!this.ehDonoDoAnuncio(artigo, utilizador)) {
            throw new ForbiddenException('Só o dono do anúncio o pode remover diretamente.');
        }

        return prisma.artigo.update({
            where: { ID_Artigo: idArtigo },
            data: {
                Estado_Anuncio: EstadoAnuncio.REMOVIDO,
                Publicado_No_Marketplace: false,
                Data_Atualizacao: new Date(),
            },
            include: this.includeBaseArtigo(),
        });
    }

    async moderarAnuncio(
        idArtigo: number,
        dto: ModerarAnuncioMarketplaceDto,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirPermissaoDeModeracao(utilizador.role);

        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        const estadoAnterior = artigo.Estado_Anuncio as EstadoAnuncio;
        const dataModeracao = new Date();

        let estadoNovo: EstadoAnuncio;
        let publicadoNoMarketplace: boolean;
        let motivoFinal: string | null;

        if (dto.acao === AcaoModeracao.REMOVER) {
            if (artigo.Estado_Anuncio === EstadoAnuncio.REMOVIDO) {
                throw new BadRequestException('O anúncio já se encontra removido.');
            }

            estadoNovo = EstadoAnuncio.REMOVIDO;
            publicadoNoMarketplace = false;
            motivoFinal = dto.motivo ?? 'Removido pela moderação.';
        } else if (dto.acao === AcaoModeracao.REATIVAR) {
            if (artigo.Estado_Anuncio !== EstadoAnuncio.REMOVIDO) {
                throw new BadRequestException('Só é possível reativar anúncios que estejam removidos.');
            }

            estadoNovo = EstadoAnuncio.ATIVO;
            publicadoNoMarketplace = true;
            motivoFinal = dto.motivo ?? artigo.Motivo_Moderacao ?? null;
        } else {
            if (artigo.Estado_Anuncio === EstadoAnuncio.ARQUIVADO) {
                throw new BadRequestException('O anúncio já se encontra arquivado.');
            }

            estadoNovo = EstadoAnuncio.ARQUIVADO;
            publicadoNoMarketplace = false;
            motivoFinal = dto.motivo ?? artigo.Motivo_Moderacao ?? null;
        }

        return prisma.$transaction(async (tx: any) => {
            const artigoAtualizado = await tx.artigo.update({
                where: { ID_Artigo: idArtigo },
                data: {
                    Estado_Anuncio: estadoNovo,
                    Publicado_No_Marketplace: publicadoNoMarketplace,
                    ID_Utilizador_Moderador: utilizador.sub,
                    Motivo_Moderacao: motivoFinal,
                    Data_Moderacao: dataModeracao,
                    Data_Atualizacao: dataModeracao,
                },
                include: this.includeBaseArtigo(),
            });

            await this.criarRegistoModeracao(tx, {
                idArtigo,
                idUtilizadorModerador: utilizador.sub,
                acao: dto.acao,
                estadoAnterior,
                estadoNovo,
                motivo: motivoFinal,
                dataRegisto: dataModeracao,
            });

            return artigoAtualizado;
        });
    }

    // ========================================================================
    // 4. INTERESSE / CONTACTO
    // ========================================================================

    async registarInteresse(
        idArtigo: number,
        dto: RegistarInteresseMarketplaceDto,
        utilizador: UtilizadorAutenticado,
    ) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        if (!artigo.Publicado_No_Marketplace || artigo.Estado_Anuncio !== EstadoAnuncio.ATIVO) {
            throw new BadRequestException('Este anúncio não está disponível para novos contactos.');
        }

        if (this.ehDonoDoAnuncio(artigo, utilizador)) {
            throw new BadRequestException('Não podes registar interesse no teu próprio anúncio.');
        }

        const stockPrincipal = this.obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O anúncio não tem stock associado.');
        }

        return prisma.interesse_Artigo.create({
            data: {
                ID_Stock: stockPrincipal.ID_Stock,
                ID_Utilizador: utilizador.sub,
                Mensagem: dto.mensagem ?? null,
                Tipo: dto.tipo ?? TipoInteresse.CONTACTO,
                Estado: 'Novo',
                Data_Registo: new Date(),
                Data_Recolha_Prevista: dto.dataRecolhaPrevista ? new Date(dto.dataRecolhaPrevista) : null,
            },
        });
    }

    async listarInteressesDoAnuncio(idArtigo: number, utilizador: UtilizadorAutenticado) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        this.garantirAcessoAoAnuncio(artigo, utilizador);

        const stockPrincipal = this.obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O anúncio não tem stock associado.');
        }

        return prisma.interesse_Artigo.findMany({
            where: {
                ID_Stock: stockPrincipal.ID_Stock,
            },
            include: {
                Utilizador: {
                    include: {
                        Pessoa: true,
                    },
                },
            },
            orderBy: [{ Data_Registo: 'desc' }],
        });
    }

    async criarItemInventario(
        dto: CriarItemInventarioDto,
        utilizador: UtilizadorAutenticado,
        file?: Express.Multer.File, // O ficheiro físico capturado pelo intercetor no controller
    ) {
        // 1. Garantir que apenas a coordenadora tem acesso a esta rota
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        let urlFoto: string | null = null;

        // 2. Se houver um ficheiro, fazemos o upload para o Azure usando o BlobsService
        if (file) {
            const nomeFicheiro = `item_${Date.now()}_${file.originalname}`;
            // Assumindo que o contentor no Azure se chama 'marketplace-fotos'
            urlFoto = await this.blobsService.guardarFotosMarketplace(
                'marketplace', 
                nomeFicheiro, 
                file
            );
        }

        // 3. Criar o registo usando uma transação para garantir integridade
        return this.prisma.$transaction(async (tx) => {
            // Criar o Artigo (a entidade base)
            const novoArtigo = await tx.artigo.create({
                data: {
                    Nome: dto.titulo,
                    Descricao: dto.descricao,
                    Foto: urlFoto, // CORREÇÃO: Usamos a variável urlFoto e não o dto
                    Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
                    Publicado_No_Marketplace: false,
                    Estado_Anuncio: EstadoAnuncio.ATIVO,
                    ID_Utilizador_Criador: utilizador.sub,
                
                    // CORREÇÃO: Passamos as datas explicitamente para satisfazer o TypeScript
                    Data_Criacao: new Date(),
                    Data_Atualizacao: new Date(), 
                },
            });

            // Criar o registo de Stock inicial para este artigo
            await tx.stock_Armazem.create({
                data: {
                    ID_Artigo: novoArtigo.ID_Artigo,
                    Quantidade_Total: dto.quantidade,
                    Quantidade_Venda: 0,
                    Quantidade_Aluguer: 0,
                },
            });

            return novoArtigo;
        });
    }

    // ========================================================================
    // 5. HELPERS PRIVADOS
    // ========================================================================

    private async obterArtigoOuFalhar(idArtigo: number) {
        const prisma = this.prisma as any;
        const artigo = await prisma.artigo.findUnique({
            where: { ID_Artigo: idArtigo },
            include: this.includeBaseArtigo(),
        });

        if (!artigo) {
            throw new NotFoundException('Artigo não encontrado.');
        }

        return artigo;
    }

    private includeBaseArtigo() {
        return {
            Stock_Armazem: {
                include: {
                    Cor: true,
                    Estado: true,
                    Tamanho: true,
                },
            },
            // Usamos o nome oficial que o Prisma gerou para o Criador
            Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador: {
                include: {
                    Pessoa: true,
                },
            },
            // Usamos o nome oficial que o Prisma gerou para o Moderador
            Utilizador_Artigo_ID_Utilizador_ModeradorToUtilizador: {
                include: {
                    Pessoa: true,
                },
            },

        };
    }

    private validarQuantidades(quantidadeTotal: number, quantidadeDisponivel: number) {
        if (quantidadeDisponivel > quantidadeTotal) {
            throw new BadRequestException(
                'A quantidade disponível no Marketplace não pode ser maior do que a quantidade total.',
            );
        }
    }

    private resolverDistribuicaoStock(params: {
        tipoAnuncio: TipoAnuncio;
        quantidadeTotal: number;
        quantidadeDisponivel?: number;
        quantidadeVenda?: number;
        quantidadeAluguer?: number;
        quantidadeVendaAtual?: number;
        quantidadeAluguerAtual?: number;
        permitirManterDistribuicaoAtual?: boolean;
    }) {
        const {
            tipoAnuncio,
            quantidadeTotal,
            quantidadeDisponivel,
            quantidadeVenda,
            quantidadeAluguer,
            quantidadeVendaAtual = 0,
            quantidadeAluguerAtual = 0,
            permitirManterDistribuicaoAtual = false,
        } = params;

        const recebeuDistribuicaoExplicita =
            quantidadeVenda !== undefined || quantidadeAluguer !== undefined;

        if (recebeuDistribuicaoExplicita) {
            const vendaFinal = quantidadeVenda ?? 0;
            const aluguerFinal = quantidadeAluguer ?? 0;
            const totalAlocado = vendaFinal + aluguerFinal;

            if (totalAlocado <= 0) {
                throw new BadRequestException(
                    'Indica pelo menos 1 unidade para venda ou aluguer.',
                );
            }

            this.validarQuantidades(quantidadeTotal, totalAlocado);

            return {
                tipoAnuncio: this.derivarTipoAnuncio(vendaFinal, aluguerFinal),
                quantidadeVenda: vendaFinal,
                quantidadeAluguer: aluguerFinal,
                quantidadeDisponivel: totalAlocado,
            };
        }

        if (quantidadeDisponivel === undefined) {
            if (permitirManterDistribuicaoAtual) {
                const totalAtual = quantidadeVendaAtual + quantidadeAluguerAtual;
                if (totalAtual <= 0) {
                    throw new BadRequestException(
                        'O anúncio não tem distribuição atual válida para manter.',
                    );
                }

                this.validarQuantidades(quantidadeTotal, totalAtual);

                return {
                    tipoAnuncio: this.derivarTipoAnuncio(quantidadeVendaAtual, quantidadeAluguerAtual),
                    quantidadeVenda: quantidadeVendaAtual,
                    quantidadeAluguer: quantidadeAluguerAtual,
                    quantidadeDisponivel: totalAtual,
                };
            }

            throw new BadRequestException(
                'Indica a quantidade disponível ou a distribuição por venda/aluguer.',
            );
        }

        this.validarQuantidades(quantidadeTotal, quantidadeDisponivel);

        if (tipoAnuncio === TipoAnuncio.AMBOS) {
            throw new BadRequestException(
                'Para anúncios com tipo "ambos", indica quantidades separadas para venda e aluguer.',
            );
        }

        return {
            tipoAnuncio,
            quantidadeVenda: tipoAnuncio === TipoAnuncio.VENDA ? quantidadeDisponivel : 0,
            quantidadeAluguer: tipoAnuncio === TipoAnuncio.ALUGUER ? quantidadeDisponivel : 0,
            quantidadeDisponivel,
        };
    }

    private derivarTipoAnuncio(quantidadeVenda: number, quantidadeAluguer: number): TipoAnuncio {
        if (quantidadeVenda > 0 && quantidadeAluguer > 0) {
            return TipoAnuncio.AMBOS;
        }

        if (quantidadeAluguer > 0) {
            return TipoAnuncio.ALUGUER;
        }

        return TipoAnuncio.VENDA;
    }

    private ehDonoDoAnuncio(artigo: any, utilizador: UtilizadorAutenticado): boolean {
        return Boolean(
            artigo.ID_Utilizador_Criador &&
            artigo.ID_Utilizador_Criador === utilizador.sub,
        );
    }

    private garantirAcessoAoAnuncio(artigo: any, utilizador: UtilizadorAutenticado) {
        const dono = this.ehDonoDoAnuncio(artigo, utilizador);
        const moderador = podeModerarMarketplace(utilizador.role);

        if (!dono && !moderador) {
            throw new ForbiddenException('Não tens permissão para gerir este anúncio.');
        }
    }

    private obterStockPrincipal(artigo: any) {
        if (!artigo?.Stock_Armazem?.length) {
            return null;
        }

        return artigo.Stock_Armazem[0];
    }

    private obterQuantidadeDisponivelAtual(artigo: any, stockPrincipal: any) {
        if (artigo.Tipo_Anuncio === TipoAnuncio.ALUGUER) {
            return stockPrincipal.Quantidade_Aluguer;
        }

        if (artigo.Tipo_Anuncio === TipoAnuncio.AMBOS) {
            return stockPrincipal.Quantidade_Venda + stockPrincipal.Quantidade_Aluguer;
        }

        return stockPrincipal.Quantidade_Venda;
    }

    private validarTransicaoDeEstado(
        estadoAtual: string,
        novoEstado: EstadoAnuncio,
        utilizador: UtilizadorAutenticado,
    ) {
        if (estadoAtual === EstadoAnuncio.REMOVIDO && novoEstado === EstadoAnuncio.ATIVO) {
            if (!podeModerarMarketplace(utilizador.role)) {
                throw new ForbiddenException('Só a moderação pode reativar um anúncio removido.');
            }
        }

        if (novoEstado === EstadoAnuncio.REMOVIDO && !podeModerarMarketplace(utilizador.role)) {
            throw new ForbiddenException(
                'A remoção administrativa deve ser feita pelo endpoint de moderação.',
            );
        }
    }

    private async criarRegistoModeracao(
        tx: any,
        params: {
            idArtigo: number;
            idUtilizadorModerador: number;
            acao: AcaoModeracao;
            estadoAnterior: EstadoAnuncio | string | null;
            estadoNovo: EstadoAnuncio | string;
            motivo?: string | null;
            dataRegisto: Date;
        },
    ) {
        return tx.registo_Moderacao_Marketplace.create({
            data: {
                ID_Artigo: params.idArtigo,
                ID_Utilizador_Moderador: params.idUtilizadorModerador,
                Acao: params.acao,
                Estado_Anterior: params.estadoAnterior,
                Estado_Novo: params.estadoNovo,
                Motivo: params.motivo ?? null,
                Data_Registo: params.dataRegisto,
            },
        });
    }
}
