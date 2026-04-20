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
 * - o dono canónico do anúncio passa a ser `ID_Utilizador_Criador`;
 * - as colunas antigas por role podem continuar numa fase de transição,
 *   para não rebentar dados antigos nem fluxos que ainda existam fora deste módulo.
 *
 * Nota técnica importante:
 * enquanto não correres `prisma generate` com o schema novo, o cliente Prisma local
 * não vai conhecer os campos novos. Por isso, neste pacote o acesso ao Prisma foi
 * mantido via `any` em alguns pontos para te deixar integrar e refatorar em casa.
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
                    in: [EstadoAnuncio.ATIVO, EstadoAnuncio.RESERVADO, EstadoAnuncio.CONCLUIDO],
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

    async listarMeusAnuncios(utilizador: UtilizadorAutenticado) {
        const prisma = this.prisma as any;

        return prisma.artigo.findMany({
            where: {
                OR: [
                    { ID_Utilizador_Criador: utilizador.sub },
                    this.criarFiltroLegacyPorRole(utilizador.role, utilizador.idPessoa),
                ],
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    async listarInventarioDaEscola(utilizador: UtilizadorAutenticado) {
        // 1. Segurança: Apenas a Coordenadora passa daqui
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const prisma = this.prisma as any; // (Nota mental: depois corre 'npx prisma generate' para tirares este any)

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
                OR: [
                    { ID_Utilizador_Criador: utilizador.sub },
                    { ID_Coordenador: utilizador.idPessoa },
                ],
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
        if (file) {
            const nomeFicheiro = `anuncio_${utilizador.sub}_${Date.now()}`;
            urlFoto = await this.blobsService.guardarFotosMarketplace('marketplace', nomeFicheiro, file);
        }

        return this.prisma.$transaction(async (tx) => {
            const novoArtigo = await tx.artigo.create({
                data: {
                    Nome: dto.titulo,
                    Descricao: dto.descricao,
                    // CORREÇÃO: O DTO recebe 'notasInternas', mas a BD chama-se 'Notas'
                    Notas: dto.notasInternas, 
                    Foto: urlFoto,
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
                    // CORREÇÃO: Mapear os IDs que vêm do DTO
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

        this.validarQuantidades(stockPrincipal.Quantidade_Total, dto.quantidadeDisponivel);

        return prisma.$transaction(async (tx: any) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: {
                    Quantidade_Venda: this.calcularQuantidadeVenda(dto.tipoAnuncio, dto.quantidadeDisponivel),
                    Quantidade_Aluguer: this.calcularQuantidadeAluguer(
                        dto.tipoAnuncio,
                        dto.quantidadeDisponivel,
                    ),
                },
            });

            return tx.artigo.update({
                where: { ID_Artigo: dto.idArtigo },
                data: {
                    Nome: dto.titulo ?? artigo.Nome,
                    Descricao: dto.descricao ?? artigo.Descricao ?? null,
                    Foto: dto.foto ?? artigo.Foto ?? null,
                    Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
                    Tipo_Anuncio: dto.tipoAnuncio,
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
    ) {
        const prisma = this.prisma as any;
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        this.garantirAcessoAoAnuncio(artigo, utilizador);

        const stockPrincipal = this.obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O artigo não tem stock associado para atualizar.');
        }

        const quantidadeTotalFinal = dto.quantidadeTotal ?? stockPrincipal.Quantidade_Total;
        const quantidadeDisponivelFinal = dto.quantidadeDisponivel ?? this.obterQuantidadeDisponivelAtual(artigo, stockPrincipal);
        const tipoFinal = dto.tipoAnuncio ?? artigo.Tipo_Anuncio;

        this.validarQuantidades(quantidadeTotalFinal, quantidadeDisponivelFinal);

        return prisma.$transaction(async (tx: any) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: {
                    Quantidade_Total: quantidadeTotalFinal,
                    Quantidade_Venda: this.calcularQuantidadeVenda(tipoFinal, quantidadeDisponivelFinal),
                    Quantidade_Aluguer: this.calcularQuantidadeAluguer(tipoFinal, quantidadeDisponivelFinal),
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
                    Foto: dto.foto ?? artigo.Foto ?? null,
                    Notas: dto.notasInternas ?? artigo.Notas ?? null,
                    Tipo_Anuncio: tipoFinal,
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
                Publicado_No_Marketplace: dto.estado !== EstadoAnuncio.ARQUIVADO && dto.estado !== EstadoAnuncio.REMOVIDO,
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

        if (dto.acao === AcaoModeracao.REMOVER) {
            return prisma.artigo.update({
                where: { ID_Artigo: idArtigo },
                data: {
                    Estado_Anuncio: EstadoAnuncio.REMOVIDO,
                    Publicado_No_Marketplace: false,
                    ID_Utilizador_Moderador: utilizador.sub,
                    Motivo_Moderacao: dto.motivo ?? 'Removido pela moderação.',
                    Data_Moderacao: new Date(),
                    Data_Atualizacao: new Date(),
                },
                include: this.includeBaseArtigo(),
            });
        }

        if (artigo.Estado_Anuncio !== EstadoAnuncio.REMOVIDO) {
            throw new BadRequestException('Só é possível reativar anúncios que estejam removidos.');
        }

        return prisma.artigo.update({
            where: { ID_Artigo: idArtigo },
            data: {
                Estado_Anuncio: EstadoAnuncio.ATIVO,
                Publicado_No_Marketplace: true,
                ID_Utilizador_Moderador: utilizador.sub,
                Motivo_Moderacao: dto.motivo ?? artigo.Motivo_Moderacao ?? null,
                Data_Moderacao: new Date(),
                Data_Atualizacao: new Date(),
            },
            include: this.includeBaseArtigo(),
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

            Coordenador: { include: { Pessoa: true } },
            Direcao: { include: { Pessoa: true } },
            Professor: { include: { Pessoa: true } },
            Enc_Educacao: { include: { Pessoa: true } },
        };
    }

    private validarQuantidades(quantidadeTotal: number, quantidadeDisponivel: number) {
        if (quantidadeDisponivel > quantidadeTotal) {
            throw new BadRequestException(
                'A quantidade disponível no Marketplace não pode ser maior do que a quantidade total.',
            );
        }
    }

    private calcularQuantidadeVenda(tipo: string, quantidadeDisponivel: number) {
        if (tipo === TipoAnuncio.VENDA) return quantidadeDisponivel;
        if (tipo === TipoAnuncio.AMBOS) return quantidadeDisponivel;
        return 0;
    }

    private calcularQuantidadeAluguer(tipo: string, quantidadeDisponivel: number) {
        if (tipo === TipoAnuncio.ALUGUER) return quantidadeDisponivel;
        if (tipo === TipoAnuncio.AMBOS) return quantidadeDisponivel;
        return 0;
    }

    private montarCamposLegacyPorRole(role: string, idPessoa: number) {
        if (role === 'Coordenador') return { ID_Coordenador: idPessoa };
        if (role === 'Direcao') return { ID_Direcao: idPessoa };
        if (role === 'Professor') return { ID_Professor: idPessoa };
        if (role === 'Enc_Educacao') return { ID_Enc_Educacao: idPessoa };
        return {};
    }

    private criarFiltroLegacyPorRole(role: string, idPessoa: number) {
        if (role === 'Coordenador') return { ID_Coordenador: idPessoa };
        if (role === 'Direcao') return { ID_Direcao: idPessoa };
        if (role === 'Professor') return { ID_Professor: idPessoa };
        if (role === 'Enc_Educacao') return { ID_Enc_Educacao: idPessoa };
        return { ID_Artigo: -1 };
    }

    private ehDonoDoAnuncio(artigo: any, utilizador: UtilizadorAutenticado): boolean {
        if (artigo.ID_Utilizador_Criador && artigo.ID_Utilizador_Criador === utilizador.sub) {
            return true;
        }

        const filtrosLegacy = this.criarFiltroLegacyPorRole(utilizador.role, utilizador.idPessoa);
        return Object.entries(filtrosLegacy).some(([campo, valor]) => artigo[campo] === valor);
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
            return Math.max(stockPrincipal.Quantidade_Venda, stockPrincipal.Quantidade_Aluguer);
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
}
