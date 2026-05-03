import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
    INCLUDE_BASE_ARTIGO,
    type ArtigoComBase,
} from './types/marketplace.prisma-types';

import {
    obterStockPrincipal,
    resolverDistribuicaoStock,
} from './helpers/marketplace-stock.helpers';

import { validarFotoMarketplace } from './helpers/marketplace-fotos.helpers';

import { calcularResultadoModeracao } from './helpers/marketplace-moderacao.helpers';

import {
    montarDadosAtualizacaoAnuncio,
    montarDadosCriacaoAnuncio,
    montarDadosCriacaoItemInventario,
    montarDadosPublicacaoInventario,
    montarDadosStockAtualizacaoAnuncio,
    montarDadosStockCriacaoAnuncio,
    montarDadosStockItemInventario,
    montarDadosStockPublicacaoInventario,
} from './mappers/marketplace-artigo.mapper';

import {
    garantirAcessoAoInventarioDaEscola,
    garantirPermissaoDeModeracao,
    podeModerarMarketplace,
} from './permissions/marketplace.permissoes';


/*
    MarketplaceService

    Este service funciona como o orquestrador principal do Marketplace.

    Responsabilidades principais:
    - listar anúncios;
    - criar anúncios;
    - publicar itens do inventário da escola;
    - atualizar anúncios;
    - alterar estados;
    - moderar anúncios;
    - registar e listar interesses.

    Regras auxiliares foram separadas para ficheiros próprios:
    - helpers/marketplace-stock.helpers.ts      -> regras de stock/distribuição;
    - helpers/marketplace-fotos.helpers.ts      -> validação de imagens;
    - helpers/marketplace-moderacao.helpers.ts  -> cálculo do resultado da moderação;
    - mappers/marketplace-artigo.mapper.ts      -> construção dos objetos data do Prisma;
    - permissions/marketplace.permissoes.ts     -> regras de permissões;
    - types/marketplace.prisma-types.ts         -> tipos Prisma usados pelo módulo.

    Assim, este ficheiro fica focado no fluxo principal e não em detalhes auxiliares.
*/

@Injectable()
export class MarketplaceService {
    constructor(
        private readonly prisma: PrismaService, 
        private readonly blobsService: BlobsService
    ) { }

    // ============================================================================
    // CONSULTA E LISTAGEM
    // ============================================================================
    // Métodos responsáveis por devolver anúncios, inventário e dados de moderação.
    // A lógica de filtros fica aqui porque depende diretamente das queries Prisma.
    // ============================================================================

    /*
    Lista anúncios do Marketplace com filtros opcionais.

    Usa Prisma.ArtigoWhereInput para garantir que os campos usados no where
    existem no schema Prisma. Isto evita erros silenciosos e substitui o uso de any.

    Exemplos de filtros:
    - estado do anúncio;
    - tipo de anúncio;
    - origem;
    - criador;
    - pesquisa textual.
    */
    async listarAnuncios(filtros: ListarAnunciosMarketplaceDto) {
        const where: Prisma.ArtigoWhereInput = {
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

        return this.prisma.artigo.findMany({
            where,
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    /**
     * Obtém o detalhe de um anúncio.
     *
     * @param idArtigo - Identificador do artigo.
     * @returns Anúncio completo.
     */
    async obterAnuncio(idArtigo: number) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        return artigo;
    }

    /*
    Lista os anúncios disponíveis para análise/moderação.

    Esta operação é exclusiva da Coordenadora/moderação.
    Antes de consultar a base de dados, validamos a role do utilizador.

    São devolvidos anúncios em vários estados relevantes para moderação:
    - ativo;
    - reservado;
    - concluído;
    - removido.
    */
    async listarAnunciosModeracao(utilizador: UtilizadorAutenticado) {
        garantirPermissaoDeModeracao(utilizador.role);

        return this.prisma.artigo.findMany({
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

    /*
    Lista o histórico de moderação do Marketplace.

    Cada registo permite perceber:
    - que anúncio foi moderado;
    - quem fez a ação;
    - qual era o estado anterior;
    - qual passou a ser o novo estado;
    - qual foi o motivo da moderação.

    Isto garante rastreabilidade e transparência nas ações administrativas.
    */
    async listarRegistoModeracao(utilizador: UtilizadorAutenticado) {
        garantirPermissaoDeModeracao(utilizador.role);

        return this.prisma.registo_Moderacao_Marketplace.findMany({
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

    /*
    Lista os anúncios criados pelo utilizador autenticado.

    A filtragem é feita através do ID do utilizador presente no token JWT.
    Assim, cada utilizador vê apenas os anúncios que criou.
    */
    async listarMeusAnuncios(utilizador: UtilizadorAutenticado) {
        return this.prisma.artigo.findMany({
            where: {
                ID_Utilizador_Criador: utilizador.sub,
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    /*
    Lista todos os itens registados como inventário da escola.

    Esta listagem é restrita a utilizadores com permissão de inventário.
    Atualmente, esta responsabilidade pertence à Coordenadora.

    Os itens devolvidos podem ou não estar publicados no Marketplace.
    */
    async listarInventarioDaEscola(utilizador: UtilizadorAutenticado) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        return this.prisma.artigo.findMany({
            where: {
                Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
            },
            include: this.includeBaseArtigo(),
            orderBy: [
                { Data_Atualizacao: 'desc' },
                { ID_Artigo: 'desc' },
            ],
        });
    }

    /*
    Lista itens do inventário da escola ainda não publicados no Marketplace.

    Esta rota é usada para permitir à Coordenadora escolher que itens internos
    podem ser disponibilizados para venda, aluguer ou ambos.

    O filtro principal é:
    - origem = INVENTARIO_ESCOLA;
    - Publicado_No_Marketplace = false.
    */
    async listarInventarioDisponivelParaPublicacao(
        utilizador: UtilizadorAutenticado,
    ) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        return this.prisma.artigo.findMany({
            where: {
                Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
                Publicado_No_Marketplace: false,
            },
            include: this.includeBaseArtigo(),
            orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
        });
    }

    // ============================================================================
    // CRIAÇÃO, PUBLICAÇÃO E ATUALIZAÇÃO
    // ============================================================================
    // Métodos que criam ou alteram anúncios e itens de inventário.
    // Sempre que há alteração conjunta em Artigo + Stock_Armazem, usamos transação.
    // Isto garante consistência: ou tudo é gravado, ou nada é gravado.
    // ============================================================================

    /*
    Cria um anúncio no Marketplace.

    Fluxo:
    1. valida e guarda a imagem, se existir;
    2. resolve a distribuição de stock entre venda e aluguer;
    3. cria o Artigo;
    4. cria o Stock_Armazem associado.

    A criação do artigo e do stock acontece numa transação para evitar anúncios
    sem stock ou stock sem artigo associado.
    */
    async criarAnuncio(dto: CriarAnuncioMarketplaceDto, utilizador: UtilizadorAutenticado, file?: Express.Multer.File) {
        const urlFoto = file
            ? await this.guardarFotoMarketplace(
                file,
                `anuncio_${utilizador.sub}_${Date.now()}`,
            )
            : null;

        const tipoAnuncio = dto.tipoAnuncio as TipoAnuncio;

        const distribuicao = resolverDistribuicaoStock({
            tipoAnuncio,
            quantidadeTotal: dto.quantidadeTotal,
            quantidadeDisponivel: dto.quantidadeDisponivel,
            quantidadeVenda: dto.quantidadeVenda,
            quantidadeAluguer: dto.quantidadeAluguer,
        });

        const dataAtual = new Date();

        return this.prisma.$transaction(async (tx) => {
            const novoArtigo = await tx.artigo.create({
                data: montarDadosCriacaoAnuncio({
                    dto,
                    idUtilizadorCriador: utilizador.sub,
                    urlFoto,
                    dataAtual,
                    distribuicao,
                }),
            });

            await tx.stock_Armazem.create({
                data: montarDadosStockCriacaoAnuncio({
                    idArtigo: novoArtigo.ID_Artigo,
                    dto,
                    distribuicao,
                }),
            });

            return novoArtigo;
        });
    }


    /*
    Publica um item do inventário da escola no Marketplace.

    Apenas a Coordenadora pode executar esta ação.

    O item já existe como Artigo de origem INVENTARIO_ESCOLA.
    Este método apenas:
    - valida permissões;
    - calcula a distribuição de venda/aluguer;
    - atualiza o stock;
    - marca o artigo como publicado no Marketplace.
    */
    async publicarInventarioDaEscola(
        dto: PublicarInventarioEscolaDto,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const artigo = await this.obterArtigoOuFalhar(dto.idArtigo);

        const dono = this.ehDonoDoAnuncio(artigo, utilizador);
        if (!dono) {
            throw new ForbiddenException('Este artigo do inventário não pertence à coordenadora autenticada.');
        }

        const stockPrincipal = obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O artigo do inventário não tem stock associado.');
        }

        const distribuicao = resolverDistribuicaoStock({
            tipoAnuncio: dto.tipoAnuncio,
            quantidadeDisponivel: dto.quantidadeDisponivel,
            quantidadeVenda: dto.quantidadeVenda,
            quantidadeAluguer: dto.quantidadeAluguer,
            quantidadeTotal: stockPrincipal.Quantidade_Total,
        });

       const dataAtual = new Date();

        return this.prisma.$transaction(async (tx) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: montarDadosStockPublicacaoInventario({
                    distribuicao,
                }),
            });

            return tx.artigo.update({
                where: { ID_Artigo: dto.idArtigo },
                data: montarDadosPublicacaoInventario({
                    dto,
                    artigo,
                    distribuicao,
                    dataAtual,
                }),
                include: this.includeBaseArtigo(),
            });
        });
    }


    /*
    Atualiza um anúncio existente.

    Regras importantes:
    - apenas o dono do anúncio ou um moderador autorizado pode atualizar;
    - se for enviada nova imagem, ela é validada e guardada;
    - o stock é recalculado com base nos novos valores enviados;
    - a atualização do artigo e do stock acontece dentro da mesma transação.
    */
    async atualizarAnuncio(
        idArtigo: number,
        dto: AtualizarAnuncioMarketplaceDto,
        utilizador: UtilizadorAutenticado,
        file?: Express.Multer.File,
    ) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);
        this.garantirAcessoAoAnuncio(artigo, utilizador);

        const stockPrincipal = obterStockPrincipal(artigo);
        if (!stockPrincipal) {
            throw new BadRequestException('O artigo não tem stock associado para atualizar.');
        }

        const quantidadeTotalFinal = dto.quantidadeTotal ?? stockPrincipal.Quantidade_Total;
        const tipoFinal = (dto.tipoAnuncio ?? artigo.Tipo_Anuncio) as TipoAnuncio;

        const distribuicao = resolverDistribuicaoStock({
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
            urlFotoFinal = await this.guardarFotoMarketplace(
                file,
                `anuncio_${idArtigo}_${Date.now()}`,
            );
        }

        const dataAtual = new Date();

        return this.prisma.$transaction(async (tx) => {
            await tx.stock_Armazem.update({
                where: { ID_Stock: stockPrincipal.ID_Stock },
                data: montarDadosStockAtualizacaoAnuncio({
                    dto,
                    stockPrincipal,
                    quantidadeTotalFinal,
                    distribuicao,
                }),
            });

            return tx.artigo.update({
                where: { ID_Artigo: idArtigo },
                data: montarDadosAtualizacaoAnuncio({
                    dto,
                    artigo,
                    urlFotoFinal,
                    distribuicao,
                    dataAtual,
                }),
                include: this.includeBaseArtigo(),
            });
        });
    }

    // ============================================================================
    // ESTADO E MODERAÇÃO
    // ============================================================================
    // Métodos relacionados com alterações de estado e moderação de anúncios.
    // A moderação tem histórico próprio para garantir rastreabilidade.
    // ============================================================================

    /*
    Altera o estado de um anúncio.

    Este método é usado para mudanças de estado feitas pelo dono do anúncio
    ou por utilizadores com permissão de moderação.

    Antes de atualizar, validamos:
    - se o utilizador pode aceder ao anúncio;
    - se a transição de estado é permitida;
    - se uma remoção administrativa está a ser feita pelo fluxo correto.
    */
    async alterarEstado(
        idArtigo: number,
        dto: AlterarEstadoAnuncioDto,
        utilizador: UtilizadorAutenticado,
    ) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        this.garantirAcessoAoAnuncio(artigo, utilizador);
        this.validarTransicaoDeEstado(artigo.Estado_Anuncio, dto.estado, utilizador);

        return this.prisma.artigo.update({
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

    /*
    Remove logicamente um anúncio criado pelo próprio utilizador.

    Não apagamos o registo da base de dados.
    Em vez disso, alteramos o estado para REMOVIDO e deixamos de o publicar.

    Esta abordagem preserva histórico e evita perda de informação.
    */
    async removerAnuncio(idArtigo: number, utilizador: UtilizadorAutenticado) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        if (!this.ehDonoDoAnuncio(artigo, utilizador)) {
            throw new ForbiddenException('Só o dono do anúncio o pode remover diretamente.');
        }

        return this.prisma.artigo.update({
            where: { ID_Artigo: idArtigo },
            data: {
                Estado_Anuncio: EstadoAnuncio.REMOVIDO,
                Publicado_No_Marketplace: false,
                Data_Atualizacao: new Date(),
            },
            include: this.includeBaseArtigo(),
        });
    }


    /*
    Modera um anúncio.

    A ação de moderação pode:
    - remover;
    - reativar;
    - arquivar.

    O cálculo do novo estado foi extraído para marketplace-moderacao.helpers.ts,
    deixando este método responsável apenas por:
    - validar permissões;
    - carregar o artigo;
    - atualizar o artigo;
    - criar o registo de moderação.

    A atualização e o registo são feitos na mesma transação para garantir
    que nunca existe uma moderação sem histórico.
    */
    async moderarAnuncio(
        idArtigo: number,
        dto: ModerarAnuncioMarketplaceDto,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirPermissaoDeModeracao(utilizador.role);

        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        const estadoAnterior = artigo.Estado_Anuncio as EstadoAnuncio;
        const dataModeracao = new Date();

        const {
            estadoNovo,
            publicadoNoMarketplace,
            motivoFinal,
        } = calcularResultadoModeracao({
            acao: dto.acao,
            estadoAtual: artigo.Estado_Anuncio,
            motivoPedido: dto.motivo,
            motivoAtual: artigo.Motivo_Moderacao,
        });

        return this.prisma.$transaction(async (tx) => {
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

    // ============================================================================
    // INTERESSES
    // ============================================================================
    // Métodos relacionados com demonstração de interesse em anúncios.
    // Um utilizador não pode registar interesse no próprio anúncio.
    // ============================================================================

    /*
    Regista interesse de um utilizador num anúncio.

    Regras:
    - o anúncio tem de estar ativo e publicado;
    - o dono do anúncio não pode registar interesse no próprio anúncio;
    - o interesse fica associado ao stock principal do artigo.
    */
    async registarInteresse(
        idArtigo: number,
        dto: RegistarInteresseMarketplaceDto,
        utilizador: UtilizadorAutenticado,
    ) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        if (!artigo.Publicado_No_Marketplace || artigo.Estado_Anuncio !== EstadoAnuncio.ATIVO) {
            throw new BadRequestException('Este anúncio não está disponível para novos contactos.');
        }

        if (this.ehDonoDoAnuncio(artigo, utilizador)) {
            throw new BadRequestException('Não podes registar interesse no teu próprio anúncio.');
        }

        const stockPrincipal = obterStockPrincipal(artigo);

        if (!stockPrincipal) {
            throw new BadRequestException('O anúncio não tem stock associado.');
        }

        return this.prisma.interesse_Artigo.create({
            data: {
                ID_Stock: stockPrincipal.ID_Stock,
                ID_Utilizador: utilizador.sub,
                Mensagem: dto.mensagem ?? null,
                Tipo: dto.tipo ?? TipoInteresse.CONTACTO,
                Estado: 'Novo',
                Data_Registo: new Date(),
                Data_Recolha_Prevista: dto.dataRecolhaPrevista
                    ? new Date(dto.dataRecolhaPrevista)
                    : null,
            },
        });
    }

    /*
    Lista os utilizadores interessados num determinado anúncio.

    O acesso é validado antes da consulta:
    - o dono do anúncio pode ver os interessados;
    - a moderação também pode consultar esta informação.

    Os interesses são associados ao stock principal do artigo.
    */
    async listarInteressesDoAnuncio(
        idArtigo: number,
        utilizador: UtilizadorAutenticado,
    ) {
        const artigo = await this.obterArtigoOuFalhar(idArtigo);

        this.garantirAcessoAoAnuncio(artigo, utilizador);

        const stockPrincipal = obterStockPrincipal(artigo);

        if (!stockPrincipal) {
            throw new BadRequestException('O anúncio não tem stock associado.');
        }

        return this.prisma.interesse_Artigo.findMany({
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

    // ============================================================================
    // INVENTÁRIO DA ESCOLA
    // ============================================================================
    // Métodos usados pela Coordenadora para gerir itens internos da escola.
    // Estes itens podem existir apenas como inventário ou ser publicados no Marketplace.
    // ============================================================================

    /*
    Cria um item no inventário da escola.

    O item nasce como Artigo, mas ainda não fica publicado no Marketplace.
    A publicação é feita posteriormente através de publicarInventarioDaEscola().

    Também é criado o stock associado, com quantidades de venda/aluguer a zero,
    porque essas quantidades só são definidas quando o item for publicado.
    */
    async criarItemInventario(dto: CriarItemInventarioDto, utilizador: UtilizadorAutenticado, file?: Express.Multer.File) {
        garantirAcessoAoInventarioDaEscola(utilizador.role);

        const urlFoto = file
        ? await this.guardarFotoMarketplace(
            file,
            `item_${Date.now()}_${file.originalname}`,
        )
        : null;

    const dataAtual = new Date();

    return this.prisma.$transaction(async (tx) => {
        const novoArtigo = await tx.artigo.create({
            data: montarDadosCriacaoItemInventario({
                dto,
                idUtilizadorCriador: utilizador.sub,
                urlFoto,
                dataAtual,
            }),
        });

        await tx.stock_Armazem.create({
            data: montarDadosStockItemInventario({
                idArtigo: novoArtigo.ID_Artigo,
                dto,
            }),
        });

        return novoArtigo;
    });
    }

    // ============================================================================
    // HELPERS PRIVADOS DO SERVICE
    // ============================================================================
    // Métodos auxiliares que continuam neste service porque dependem diretamente
    // de Prisma, BlobsService ou do contexto interno do MarketplaceService.
    // ============================================================================

    /*
    Obtém um artigo com as relações base usadas pelo Marketplace.

    Se o artigo não existir, lança NotFoundException.
    Isto evita repetir a mesma validação em vários métodos públicos.
    */
    private async obterArtigoOuFalhar(idArtigo: number): Promise<ArtigoComBase> {
        const artigo = await this.prisma.artigo.findUnique({
            where: { ID_Artigo: idArtigo },
            include: this.includeBaseArtigo(),
        });

        if (!artigo) {
            throw new NotFoundException('Artigo não encontrado.');
        }

        return artigo;
    }

    /*
    Valida e guarda uma fotografia do Marketplace.

    A validação da imagem está num helper puro.
    O upload fica aqui porque depende do BlobsService, que é injetado pelo NestJS.
    */
    private async guardarFotoMarketplace(
        file: Express.Multer.File,
        nomeFicheiro: string,
    ): Promise<string> {
        // Valida o ficheiro antes de gastar recursos a enviar para a cloud.
        validarFotoMarketplace(file);

        return this.blobsService.guardarFotosMarketplace(
            'marketplace',
            nomeFicheiro,
            file,
        );
    }

    /*
    Devolve o include base usado nas queries de Artigo do Marketplace.

    O include está centralizado em marketplace.prisma-types.ts para garantir
    que todas as consultas carregam as mesmas relações essenciais:
    - stock;
    - cor;
    - estado;
    - tamanho;
    - criador;
    - moderador.
    */
    private includeBaseArtigo(): typeof INCLUDE_BASE_ARTIGO {
        return INCLUDE_BASE_ARTIGO;
    }

    /*
    Verifica se o utilizador autenticado é o criador do anúncio.

    Esta validação é usada em operações onde o dono pode gerir o próprio anúncio,
    como editar, remover ou consultar interessados.
    */
    private ehDonoDoAnuncio(artigo: ArtigoComBase, utilizador: UtilizadorAutenticado) : boolean 
    {
        return Boolean(
            artigo.ID_Utilizador_Criador &&
            artigo.ID_Utilizador_Criador === utilizador.sub,
        );
    }

    /*
    Garante que o utilizador pode gerir ou consultar informação sensível do anúncio.

    O acesso é permitido quando:
    - o utilizador é dono do anúncio;
    - o utilizador tem permissões de moderação.

    Caso contrário, é lançada uma exceção ForbiddenException.
    */
    private garantirAcessoAoAnuncio(artigo: ArtigoComBase, utilizador: UtilizadorAutenticado) {
        const dono = this.ehDonoDoAnuncio(artigo, utilizador);
        const moderador = podeModerarMarketplace(utilizador.role);

        if (!dono && !moderador) {
            throw new ForbiddenException('Não tens permissão para gerir este anúncio.');
        }
    }

    /*
    Valida se uma alteração de estado é permitida.

    Regras principais:
    - anúncios removidos só podem ser reativados pela moderação;
    - remoções administrativas devem passar pelo endpoint de moderação;
    - evita que utilizadores comuns executem ações reservadas à Coordenadora.
    */
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

    /*
    Cria o histórico de moderação de um anúncio.

    Recebe o transaction client para garantir que o registo de moderação
    é criado na mesma transação que altera o artigo.
    */
    private async criarRegistoModeracao(
       tx: Prisma.TransactionClient,
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
