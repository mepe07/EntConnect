import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { CriarPedidoAluguerDto } from './dto/criar-pedido-aluguer.dto';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { EstadoAnuncio } from './enums/estado-anuncio.enum';
import { TipoAnuncio } from './enums/tipo-anuncio.enum';
import { OrigemRegisto } from './enums/origem-registo.enum';
import { TipoInteresse } from './enums/tipo-interesse.enum';
import { AcaoModeracao } from './enums/acao-moderacao.enum';
import {
  INCLUDE_BASE_ARTIGO,
  INCLUDE_ALUGUER_ARTIGO,
  INCLUDE_PEDIDO_ALUGUER,
  type AluguerArtigoComDetalhe,
  type ArtigoComBase,
  type PedidoAluguerComDetalhe,
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

const ESTADO_PEDIDO_PENDENTE = 'Pendente';
const ESTADO_PEDIDO_ACEITE = 'Aceite';
const ESTADO_PEDIDO_REJEITADO = 'Rejeitado';
const ESTADO_PEDIDO_CANCELADO = 'Cancelado';

const ESTADO_ALUGUER_RESERVADO = 'Reservado';
const ESTADO_ALUGUER_ATIVO = 'Ativo';
const ESTADO_ALUGUER_DEVOLUCAO_PENDENTE = 'Devolucao_Pendente';
const ESTADO_ALUGUER_CONCLUIDO = 'Concluido';
const ESTADOS_ALUGUER_BLOQUEANTES = [
  ESTADO_ALUGUER_RESERVADO,
  ESTADO_ALUGUER_ATIVO,
  ESTADO_ALUGUER_DEVOLUCAO_PENDENTE,
];
/**
 * Servico responsavel pela logica de Marketplace.
 */

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blobsService: BlobsService,
  ) {}

  /**
   * Executa a operacao listar anuncios.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarAnuncios(filtros: ListarAnunciosMarketplaceDto) {
    const where: Prisma.ArtigoWhereInput = {
      Publicado_No_Marketplace: filtros.publicado ?? true,
      Estado_Anuncio: filtros.estado ?? {
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
   * Executa a operacao obter anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async obterAnuncio(idArtigo: number) {
    const artigo = await this.obterArtigoOuFalhar(idArtigo);
    return artigo;
  }

  /**
   * Executa a operacao obter calendario do anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async obterCalendarioAnuncio(
    idArtigo: number,
    utilizador: UtilizadorAutenticado,
  ) {
    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    if (artigo.Tipo_Anuncio !== TipoAnuncio.ALUGUER) {
      throw new BadRequestException(
        'O calendário só está disponível para anúncios de aluguer.',
      );
    }

    const stockPrincipal = this.obterStockDoArtigoOuFalhar(artigo);
    const eDono = this.ehDonoDoAnuncio(artigo, utilizador);

    const alugueres = await this.obterAlugueresBloqueantesDoArtigo(
      stockPrincipal.ID_Stock,
      eDono,
    );

    return alugueres.map((aluguer) =>
      this.mapearItemCalendarioAnuncio(aluguer, eDono),
    );
  }

  /**
   * Executa a operacao listar anuncios moderacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao listar registo moderacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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
      orderBy: [{ Data_Registo: 'desc' }, { ID_Registo_Moderacao: 'desc' }],
    });
  }

  /**
   * Executa a operacao listar meus anuncios.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao listar meus alugueres.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarMeusAlugueres(utilizador: UtilizadorAutenticado) {
    const [pedidos, alugueres] = await Promise.all([
      this.listarPedidosAluguerDoUtilizador(utilizador.sub),
      this.listarAlugueresDoUtilizador(utilizador.sub),
    ]);

    const itensPedidos = pedidos.map((pedido) =>
      this.mapearPedidoParaMeuAluguer(pedido, utilizador.sub),
    );
    const itensAlugueres = alugueres.map((aluguer) =>
      this.mapearAluguerParaMeuAluguer(aluguer, utilizador.sub),
    );

    return [...itensPedidos, ...itensAlugueres].sort((itemA, itemB) =>
      this.ordenarMeusAlugueres(itemA, itemB),
    );
  }

  /**
   * Executa a operacao listar inventario da escola.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarInventarioDaEscola(utilizador: UtilizadorAutenticado) {
    garantirAcessoAoInventarioDaEscola(utilizador.role);

    return this.prisma.artigo.findMany({
      where: {
        Origem_Registo: OrigemRegisto.INVENTARIO_ESCOLA,
      },
      include: this.includeBaseArtigo(),
      orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Artigo: 'desc' }],
    });
  }

  /**
   * Executa a operacao listar inventario disponivel para publicacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao criar anuncio.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarAnuncio(
    dto: CriarAnuncioMarketplaceDto,
    utilizador: UtilizadorAutenticado,
    file?: Express.Multer.File,
  ) {
    this.validarTipoAnuncioParaEscrita(dto.tipoAnuncio);

    this.logger.log(
      `A criar anuncio marketplace userId=${utilizador.sub} tipo=${dto.tipoAnuncio} comFoto=${Boolean(file)}`,
    );

    const urlFoto = file
      ? await this.guardarFotoMarketplace(
          file,
          `anuncio_${utilizador.sub}_${Date.now()}`,
        )
      : null;

    const dataAtual = new Date();

    const artigo = await this.prisma.$transaction(async (tx) => {
      const novoArtigo = await tx.artigo.create({
        data: montarDadosCriacaoAnuncio({
          dto,
          idUtilizadorCriador: utilizador.sub,
          urlFoto,
          dataAtual,
        }),
      });

      await tx.stock_Armazem.create({
        data: montarDadosStockCriacaoAnuncio({
          idArtigo: novoArtigo.ID_Artigo,
          dto,
        }),
      });

      return novoArtigo;
    });

    this.logger.log(
      `Anuncio marketplace criado idArtigo=${artigo.ID_Artigo} userId=${utilizador.sub}`,
    );
    return artigo;
  }

  /**
   * Executa a operacao publicar inventario da escola.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async publicarInventarioDaEscola(
    dto: PublicarInventarioEscolaDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.validarTipoAnuncioParaEscrita(dto.tipoAnuncio);
    this.validarModoExclusivoDePublicacao(
      dto.quantidadeVenda,
      dto.quantidadeAluguer,
    );

    this.logger.log(
      `A publicar inventario da escola idArtigo=${dto.idArtigo} userId=${utilizador.sub}`,
    );

    garantirAcessoAoInventarioDaEscola(utilizador.role);

    const artigo = await this.obterArtigoOuFalhar(dto.idArtigo);

    const dono = this.ehDonoDoAnuncio(artigo, utilizador);
    if (!dono) {
      this.logger.warn(
        `Publicacao de inventario rejeitada: utilizador nao e dono idArtigo=${dto.idArtigo} userId=${utilizador.sub}`,
      );
      throw new ForbiddenException(
        'Este artigo do inventário não pertence à coordenadora autenticada.',
      );
    }

    const stockPrincipal = obterStockPrincipal(artigo);
    if (!stockPrincipal) {
      throw new BadRequestException(
        'O artigo do inventário não tem stock associado.',
      );
    }

    const distribuicao = resolverDistribuicaoStock({
      tipoAnuncio: dto.tipoAnuncio,
      quantidadeDisponivel: dto.quantidadeDisponivel,
      quantidadeVenda: dto.quantidadeVenda,
      quantidadeAluguer: dto.quantidadeAluguer,
      quantidadeTotal: stockPrincipal.Quantidade_Total,
    });
    this.validarTipoAnuncioParaEscrita(distribuicao.tipoAnuncio);

    const dataAtual = new Date();

    const artigoPublicado = await this.prisma.$transaction(async (tx) => {
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

    this.logger.log(
      `Inventario publicado no marketplace idArtigo=${dto.idArtigo} userId=${utilizador.sub}`,
    );
    return artigoPublicado;
  }

  /**
   * Executa a operacao atualizar anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async atualizarAnuncio(
    idArtigo: number,
    dto: AtualizarAnuncioMarketplaceDto,
    utilizador: UtilizadorAutenticado,
    file?: Express.Multer.File,
  ) {
    this.logger.log(
      `A atualizar anuncio idArtigo=${idArtigo} userId=${utilizador.sub} comFoto=${Boolean(file)}`,
    );

    const artigo = await this.obterArtigoOuFalhar(idArtigo);
    this.garantirAcessoAoAnuncio(artigo, utilizador);

    const stockPrincipal = obterStockPrincipal(artigo);
    if (!stockPrincipal) {
      throw new BadRequestException(
        'O artigo não tem stock associado para atualizar.',
      );
    }

    const quantidadeTotalFinal =
      dto.quantidadeTotal ?? stockPrincipal.Quantidade_Total;
    const tipoFinal = (dto.tipoAnuncio ?? artigo.Tipo_Anuncio) as TipoAnuncio;
    this.validarTipoAnuncioParaEscrita(tipoFinal);

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
    this.validarTipoAnuncioParaEscrita(distribuicao.tipoAnuncio);

    let urlFotoFinal = dto.foto ?? artigo.Foto ?? null;

    if (file) {
      urlFotoFinal = await this.guardarFotoMarketplace(
        file,
        `anuncio_${idArtigo}_${Date.now()}`,
      );
    }

    const dataAtual = new Date();

    const artigoAtualizado = await this.prisma.$transaction(async (tx) => {
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

    this.logger.log(`Anuncio atualizado idArtigo=${idArtigo} userId=${utilizador.sub}`);
    return artigoAtualizado;
  }

  /**
   * Executa a operacao alterar estado.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async alterarEstado(
    idArtigo: number,
    dto: AlterarEstadoAnuncioDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A alterar estado de anuncio idArtigo=${idArtigo} novoEstado=${dto.estado} userId=${utilizador.sub}`,
    );

    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    this.garantirAcessoAoAnuncio(artigo, utilizador);
    this.validarTransicaoDeEstado(
      artigo.Estado_Anuncio,
      dto.estado,
      utilizador,
    );

    const artigoAtualizado = await this.prisma.artigo.update({
      where: { ID_Artigo: idArtigo },
      data: {
        Estado_Anuncio: dto.estado,
        Publicado_No_Marketplace: dto.estado === EstadoAnuncio.ATIVO,
        Motivo_Moderacao:
          dto.estado === EstadoAnuncio.REMOVIDO &&
          podeModerarMarketplace(utilizador.role)
            ? (dto.motivo ?? artigo.Motivo_Moderacao ?? null)
            : (artigo.Motivo_Moderacao ?? null),
        Data_Moderacao:
          dto.estado === EstadoAnuncio.REMOVIDO &&
          podeModerarMarketplace(utilizador.role)
            ? new Date()
            : (artigo.Data_Moderacao ?? null),
        ID_Utilizador_Moderador:
          dto.estado === EstadoAnuncio.REMOVIDO &&
          podeModerarMarketplace(utilizador.role)
            ? utilizador.sub
            : (artigo.ID_Utilizador_Moderador ?? null),
        Data_Atualizacao: new Date(),
      },
      include: this.includeBaseArtigo(),
    });

    this.logger.log(
      `Estado de anuncio alterado idArtigo=${idArtigo} novoEstado=${dto.estado} userId=${utilizador.sub}`,
    );
    return artigoAtualizado;
  }

  /**
   * Executa a operacao remover anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async removerAnuncio(idArtigo: number, utilizador: UtilizadorAutenticado) {
    this.logger.log(`A remover anuncio idArtigo=${idArtigo} userId=${utilizador.sub}`);

    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    if (!this.ehDonoDoAnuncio(artigo, utilizador)) {
      this.logger.warn(
        `Remocao de anuncio rejeitada: utilizador nao e dono idArtigo=${idArtigo} userId=${utilizador.sub}`,
      );
      throw new ForbiddenException(
        'Só o dono do anúncio o pode remover diretamente.',
      );
    }

    const artigoRemovido = await this.prisma.artigo.update({
      where: { ID_Artigo: idArtigo },
      data: {
        Estado_Anuncio: EstadoAnuncio.REMOVIDO,
        Publicado_No_Marketplace: false,
        Data_Atualizacao: new Date(),
      },
      include: this.includeBaseArtigo(),
    });

    this.logger.log(`Anuncio removido idArtigo=${idArtigo} userId=${utilizador.sub}`);
    return artigoRemovido;
  }

  /**
   * Executa a operacao moderar anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async moderarAnuncio(
    idArtigo: number,
    dto: ModerarAnuncioMarketplaceDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A moderar anuncio idArtigo=${idArtigo} acao=${dto.acao} userId=${utilizador.sub}`,
    );

    garantirPermissaoDeModeracao(utilizador.role);

    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    const estadoAnterior = artigo.Estado_Anuncio as EstadoAnuncio;
    const dataModeracao = new Date();

    const { estadoNovo, publicadoNoMarketplace, motivoFinal } =
      calcularResultadoModeracao({
        acao: dto.acao,
        estadoAtual: artigo.Estado_Anuncio,
        motivoPedido: dto.motivo,
        motivoAtual: artigo.Motivo_Moderacao,
      });

    const artigoModerado = await this.prisma.$transaction(async (tx) => {
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

    this.logger.log(
      `Anuncio moderado idArtigo=${idArtigo} acao=${dto.acao} estadoAnterior=${estadoAnterior} estadoNovo=${estadoNovo} userId=${utilizador.sub}`,
    );
    return artigoModerado;
  }

  /**
   * Executa a operacao registar interesse.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async registarInteresse(
    idArtigo: number,
    dto: RegistarInteresseMarketplaceDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A registar interesse marketplace idArtigo=${idArtigo} userId=${utilizador.sub} tipo=${dto.tipo ?? TipoInteresse.CONTACTO}`,
    );

    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    if (
      !artigo.Publicado_No_Marketplace ||
      artigo.Estado_Anuncio !== EstadoAnuncio.ATIVO
    ) {
      this.logger.warn(
        `Interesse rejeitado: anuncio indisponivel idArtigo=${idArtigo} userId=${utilizador.sub}`,
      );
      throw new BadRequestException(
        'Este anúncio não está disponível para novos contactos.',
      );
    }

    if (this.ehDonoDoAnuncio(artigo, utilizador)) {
      this.logger.warn(
        `Interesse rejeitado: dono tentou contactar proprio anuncio idArtigo=${idArtigo} userId=${utilizador.sub}`,
      );
      throw new BadRequestException(
        'Não podes registar interesse no teu próprio anúncio.',
      );
    }

    const stockPrincipal = obterStockPrincipal(artigo);

    if (!stockPrincipal) {
      throw new BadRequestException('O anúncio não tem stock associado.');
    }

    const interesse = await this.prisma.interesse_Artigo.create({
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

    this.logger.log(
      `Interesse marketplace registado idInteresse=${interesse.ID_Interesse} idArtigo=${idArtigo} userId=${utilizador.sub}`,
    );
    return interesse;
  }

  /**
   * Executa a operacao criar pedido de aluguer.
   * @param idArtigo Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarPedidoAluguer(
    idArtigo: number,
    dto: CriarPedidoAluguerDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A criar pedido de aluguer idArtigo=${idArtigo} userId=${utilizador.sub}`,
    );

    const artigo = await this.obterArtigoOuFalhar(idArtigo);
    this.validarAnuncioDisponivelParaPedidoAluguer(artigo, utilizador);

    const stockPrincipal = this.obterStockDoArtigoOuFalhar(artigo);
    this.validarStockDisponivelParaAluguer(stockPrincipal.Quantidade_Aluguer);

    const { dataInicio, dataFim } = this.validarDatasPedidoAluguer(
      dto.dataInicio,
      dto.dataFim,
    );

    await this.validarSobreposicaoAluguer(
      stockPrincipal.ID_Stock,
      dataInicio,
      dataFim,
    );

    const pedido = await this.prisma.interesse_Artigo.create({
      data: {
        ID_Stock: stockPrincipal.ID_Stock,
        ID_Utilizador: utilizador.sub,
        Mensagem: dto.mensagem ?? null,
        Tipo: TipoInteresse.ALUGUER,
        Estado: ESTADO_PEDIDO_PENDENTE,
        Data_Registo: new Date(),
        Data_Inicio_Pretendida: dataInicio,
        Data_Fim_Pretendida: dataFim,
        Data_Recolha_Prevista: dataFim,
      },
      include: this.includePedidoAluguer(),
    });

    this.logger.log(
      `Pedido de aluguer criado idInteresse=${pedido.ID_Interesse} idArtigo=${idArtigo} userId=${utilizador.sub}`,
    );
    return pedido;
  }

  /**
   * Executa a operacao aceitar pedido de aluguer.
   * @param idInteresse Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async aceitarPedidoAluguer(
    idInteresse: number,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A aceitar pedido de aluguer idInteresse=${idInteresse} userId=${utilizador.sub}`,
    );

    const pedidoExistente = await this.obterPedidoAluguerOuFalhar(idInteresse);
    this.validarPermissaoSobrePedidoAluguer(pedidoExistente, utilizador);
    this.validarPedidoPendente(pedidoExistente.Estado);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.interesse_Artigo.findUnique({
        where: { ID_Interesse: idInteresse },
        include: this.includePedidoAluguer(),
      });

      if (!pedido) {
        throw new NotFoundException('Pedido de aluguer não encontrado.');
      }

      this.validarPermissaoSobrePedidoAluguer(pedido, utilizador);
      this.validarPedidoPendente(pedido.Estado);
      this.validarPedidoDeAluguer(pedido.Tipo);

      const dataInicio = pedido.Data_Inicio_Pretendida;
      const dataFim = pedido.Data_Fim_Pretendida;

      if (!dataInicio || !dataFim) {
        throw new BadRequestException(
          'O pedido de aluguer não tem datas suficientes para ser aceite.',
        );
      }

      const stock = pedido.Stock_Armazem;
      if (!stock) {
        throw new BadRequestException(
          'O pedido de aluguer não tem stock associado.',
        );
      }

      const artigo = stock.Artigo;
      if (!artigo) {
        throw new BadRequestException(
          'O pedido de aluguer não tem um artigo associado.',
        );
      }

      this.validarStockDisponivelParaAluguer(stock.Quantidade_Aluguer);

      await this.validarSobreposicaoAluguer(
        stock.ID_Stock,
        dataInicio,
        dataFim,
        tx,
      );

      const aluguer = await tx.aluguer_Artigo.create({
        data: {
          ID_Stock: stock.ID_Stock,
          ID_Utilizador: pedido.ID_Utilizador,
          Data_Entrega: dataInicio,
          Data_Recolha_Prevista: dataFim,
          Estado: this.calcularEstadoInicialDoAluguer(dataInicio),
        },
        include: this.includeAluguerArtigo(),
      });

      await tx.interesse_Artigo.update({
        where: { ID_Interesse: idInteresse },
        data: {
          Estado: ESTADO_PEDIDO_ACEITE,
        },
      });

      await tx.artigo.update({
        where: { ID_Artigo: stock.ID_Artigo },
        data: {
          Estado_Anuncio: artigo.Aluguer_Continuo
            ? EstadoAnuncio.ATIVO
            : EstadoAnuncio.RESERVADO,
          Publicado_No_Marketplace: artigo.Aluguer_Continuo,
          Data_Atualizacao: new Date(),
        },
      });
      return aluguer;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    this.logger.log(
      `Pedido de aluguer aceite idInteresse=${idInteresse} userId=${utilizador.sub}`,
    );
    return resultado;
  }

  /**
   * Executa a operacao rejeitar pedido de aluguer.
   * @param idInteresse Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async rejeitarPedidoAluguer(
    idInteresse: number,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A rejeitar pedido de aluguer idInteresse=${idInteresse} userId=${utilizador.sub}`,
    );

    const pedido = await this.obterPedidoAluguerOuFalhar(idInteresse);
    this.validarPermissaoSobrePedidoAluguer(pedido, utilizador);
    this.validarPedidoPendente(pedido.Estado);

    return this.prisma.interesse_Artigo.update({
      where: { ID_Interesse: idInteresse },
      data: {
        Estado: ESTADO_PEDIDO_REJEITADO,
      },
      include: this.includePedidoAluguer(),
    });
  }

  /**
   * Executa a operacao marcar aluguer como devolvido.
   * @param idAluguer Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async marcarAluguerComoDevolvido(
    idAluguer: number,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A marcar aluguer como devolvido idAluguer=${idAluguer} userId=${utilizador.sub}`,
    );

    const aluguer = await this.obterAluguerOuFalhar(idAluguer);

    if (aluguer.ID_Utilizador !== utilizador.sub) {
      throw new ForbiddenException(
        'Só o utilizador que alugou o artigo o pode marcar como devolvido.',
      );
    }

    if (aluguer.Estado !== ESTADO_ALUGUER_ATIVO) {
      throw new BadRequestException(
        'Apenas alugueres ativos podem ser marcados como devolvidos.',
      );
    }

    return this.prisma.aluguer_Artigo.update({
      where: { ID_Aluguer: idAluguer },
      data: {
        Estado: ESTADO_ALUGUER_DEVOLUCAO_PENDENTE,
      },
      include: this.includeAluguerArtigo(),
    });
  }

  /**
   * Executa a operacao confirmar devolucao de aluguer.
   * @param idAluguer Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async confirmarDevolucaoAluguer(
    idAluguer: number,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A confirmar devolucao de aluguer idAluguer=${idAluguer} userId=${utilizador.sub}`,
    );

    const aluguer = await this.obterAluguerOuFalhar(idAluguer);
    const artigo = aluguer.Stock_Armazem?.Artigo;

    if (!artigo) {
      throw new BadRequestException(
        'O aluguer não tem um artigo associado para concluir a devolução.',
      );
    }

    this.validarDonoDoArtigo(artigo, utilizador);

    if (
      aluguer.Estado !== ESTADO_ALUGUER_ATIVO &&
      aluguer.Estado !== ESTADO_ALUGUER_DEVOLUCAO_PENDENTE
    ) {
      throw new BadRequestException(
        'A devolução só pode ser confirmada para alugueres ativos ou pendentes de confirmação.',
      );
    }

    const dataConclusao = new Date();

    return this.prisma.$transaction(async (tx) => {
      const aluguerAtualizado = await tx.aluguer_Artigo.update({
        where: { ID_Aluguer: idAluguer },
        data: {
          Estado: ESTADO_ALUGUER_CONCLUIDO,
          Data_Recolha_Efetiva: dataConclusao,
        },
        include: this.includeAluguerArtigo(),
      });

      await tx.artigo.update({
        where: { ID_Artigo: artigo.ID_Artigo },
        data: {
          Estado_Anuncio: artigo.Aluguer_Continuo
            ? EstadoAnuncio.ATIVO
            : EstadoAnuncio.CONCLUIDO,
          Publicado_No_Marketplace: artigo.Aluguer_Continuo,
          Data_Atualizacao: dataConclusao,
        },
      });

      return aluguerAtualizado;
    });
  }

  /**
   * Executa a operacao listar interesses do anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao criar item inventario.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarItemInventario(
    dto: CriarItemInventarioDto,
    utilizador: UtilizadorAutenticado,
    file?: Express.Multer.File,
  ) {
    this.logger.log(
      `A criar item de inventario userId=${utilizador.sub} comFoto=${Boolean(file)}`,
    );

    garantirAcessoAoInventarioDaEscola(utilizador.role);

    const urlFoto = file
      ? await this.guardarFotoMarketplace(
          file,
          `item_${Date.now()}_${file.originalname}`,
        )
      : null;

    const dataAtual = new Date();

    const artigo = await this.prisma.$transaction(async (tx) => {
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

    this.logger.log(
      `Item de inventario criado idArtigo=${artigo.ID_Artigo} userId=${utilizador.sub}`,
    );
    return artigo;
  }

  /**
   * Executa a operacao obter artigo ou falhar.
   * @param idArtigo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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

  /**
   * Executa a operacao guardar foto marketplace.
   * @param file Dados recebidos para a operacao.
   * @param nomeFicheiro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async guardarFotoMarketplace(
    file: Express.Multer.File,
    nomeFicheiro: string,
  ): Promise<string> {
    validarFotoMarketplace(file);

    return this.blobsService.guardarFotosMarketplace(
      'marketplace',
      nomeFicheiro,
      file,
    );
  }

  /**
   * Executa a operacao include base artigo.
   * @returns Resultado da operacao.
   */

  private includeBaseArtigo(): typeof INCLUDE_BASE_ARTIGO {
    return INCLUDE_BASE_ARTIGO;
  }

  /**
   * Executa a operacao include pedido aluguer.
   * @returns Resultado da operacao.
   */

  private includePedidoAluguer() {
    return INCLUDE_PEDIDO_ALUGUER;
  }

  /**
   * Executa a operacao listar pedidos de aluguer do utilizador.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private listarPedidosAluguerDoUtilizador(idUtilizador: number) {
    return this.prisma.interesse_Artigo.findMany({
      where: {
        Tipo: TipoInteresse.ALUGUER,
        Estado: {
          in: [
            ESTADO_PEDIDO_PENDENTE,
            ESTADO_PEDIDO_REJEITADO,
            ESTADO_PEDIDO_CANCELADO,
          ],
        },
        OR: [
          { ID_Utilizador: idUtilizador },
          {
            Stock_Armazem: {
              Artigo: {
                ID_Utilizador_Criador: idUtilizador,
              },
            },
          },
        ],
      },
      include: this.includePedidoAluguer(),
      orderBy: [{ Data_Registo: 'desc' }, { ID_Interesse: 'desc' }],
    });
  }

  /**
   * Executa a operacao include aluguer artigo.
   * @returns Resultado da operacao.
   */

  private includeAluguerArtigo() {
    return INCLUDE_ALUGUER_ARTIGO;
  }

  /**
   * Executa a operacao listar alugueres do utilizador.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private listarAlugueresDoUtilizador(idUtilizador: number) {
    return this.prisma.aluguer_Artigo.findMany({
      where: {
        OR: [
          { ID_Utilizador: idUtilizador },
          {
            Stock_Armazem: {
              Artigo: {
                ID_Utilizador_Criador: idUtilizador,
              },
            },
          },
        ],
      },
      include: this.includeAluguerArtigo(),
      orderBy: [{ Data_Entrega: 'desc' }, { ID_Aluguer: 'desc' }],
    });
  }

  /**
   * Executa a operacao obter alugueres bloqueantes do artigo.
   * @param idStock Dados recebidos para a operacao.
   * @param incluirDadosPessoais Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private obterAlugueresBloqueantesDoArtigo(
    idStock: number,
    _incluirDadosPessoais: boolean,
  ) {
    return this.prisma.aluguer_Artigo.findMany({
      where: {
        ID_Stock: idStock,
        Estado: {
          in: ESTADOS_ALUGUER_BLOQUEANTES,
        },
      },
      include: this.includeAluguerArtigo(),
      orderBy: [{ Data_Entrega: 'asc' }, { ID_Aluguer: 'asc' }],
    });
  }

  /**
   * Executa a operacao mapear item calendario anuncio.
   * @param aluguer Dados recebidos para a operacao.
   * @param eDono Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearItemCalendarioAnuncio(
    aluguer: AluguerArtigoComDetalhe,
    eDono: boolean,
  ) {
    if (!eDono) {
      return {
        dataInicio: this.formatarDataCalendario(aluguer.Data_Entrega),
        dataFim: this.formatarDataCalendario(aluguer.Data_Recolha_Prevista),
        estado: 'ocupado',
      };
    }

    return {
      idAluguer: aluguer.ID_Aluguer,
      dataInicio: this.formatarDataCalendario(aluguer.Data_Entrega),
      dataFim: this.formatarDataCalendario(aluguer.Data_Recolha_Prevista),
      estado: this.mapearEstadoCalendarioDono(aluguer.Estado),
      nomePessoa: aluguer.Utilizador?.Pessoa?.Nome ?? null,
      contacto:
        aluguer.Utilizador?.Pessoa?.Email ??
        aluguer.Utilizador?.Pessoa?.Contacto ??
        null,
    };
  }

  /**
   * Executa a operacao mapear pedido para meu aluguer.
   * @param pedido Dados recebidos para a operacao.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearPedidoParaMeuAluguer(
    pedido: PedidoAluguerComDetalhe,
    idUtilizador: number,
  ) {
    const artigo = pedido.Stock_Armazem?.Artigo;
    const papel = pedido.ID_Utilizador === idUtilizador ? 'interessado' : 'dono';
    const estado = this.normalizarEstadoPedidoAluguer(pedido.Estado);
    const nomeDono = artigo?.Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador?.Pessoa?.Nome;
    const nomeInteressado = pedido.Utilizador?.Pessoa?.Nome ?? null;

    return {
      id: pedido.ID_Interesse,
      tipoRegisto: 'pedido',
      idAluguer: null,
      idPedido: pedido.ID_Interesse,
      idAnuncio: artigo?.ID_Artigo ?? null,
      artigo: artigo?.Nome ?? null,
      categoria: null,
      foto: artigo?.Foto ?? null,
      estado,
      papel,
      inicio: pedido.Data_Inicio_Pretendida
        ? this.formatarDataCalendario(pedido.Data_Inicio_Pretendida)
        : null,
      fim: pedido.Data_Fim_Pretendida
        ? this.formatarDataCalendario(pedido.Data_Fim_Pretendida)
        : null,
      outraPessoa:
        papel === 'dono'
          ? nomeInteressado
          : this.resolverDescricaoOutraPessoa(artigo, nomeDono),
      contactoOutraPessoa:
        papel === 'dono'
          ? this.resolverContactoPessoa(pedido.Utilizador?.Pessoa)
          : null,
      origem: this.mapearOrigemArtigo(artigo?.Origem_Registo),
      aluguerContinuo: Boolean(artigo?.Aluguer_Continuo),
      podeAceitar: papel === 'dono' && estado === 'pendente',
      podeRejeitar: papel === 'dono' && estado === 'pendente',
      podeMarcarComoDevolvido: false,
      podeConfirmarDevolucao: false,
      podeCancelar: false,
      podeVerAnuncio: Boolean(artigo?.ID_Artigo),
    };
  }

  /**
   * Executa a operacao mapear aluguer para meu aluguer.
   * @param aluguer Dados recebidos para a operacao.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearAluguerParaMeuAluguer(
    aluguer: AluguerArtigoComDetalhe,
    idUtilizador: number,
  ) {
    const artigo = aluguer.Stock_Armazem?.Artigo;
    const papel = aluguer.ID_Utilizador === idUtilizador ? 'interessado' : 'dono';
    const estado = this.normalizarEstadoAluguer(aluguer.Estado);
    const nomeDono = artigo?.Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador?.Pessoa?.Nome;
    const nomeInteressado = aluguer.Utilizador?.Pessoa?.Nome ?? null;

    return {
      id: aluguer.ID_Aluguer,
      tipoRegisto: 'aluguer',
      idAluguer: aluguer.ID_Aluguer,
      idPedido: null,
      idAnuncio: artigo?.ID_Artigo ?? null,
      artigo: artigo?.Nome ?? null,
      categoria: null,
      foto: artigo?.Foto ?? null,
      estado,
      papel,
      inicio: this.formatarDataCalendario(aluguer.Data_Entrega),
      fim: this.formatarDataCalendario(aluguer.Data_Recolha_Prevista),
      outraPessoa:
        papel === 'dono'
          ? nomeInteressado
          : this.resolverDescricaoOutraPessoa(artigo, nomeDono),
      contactoOutraPessoa:
        papel === 'dono'
          ? this.resolverContactoPessoa(aluguer.Utilizador?.Pessoa)
          : null,
      origem: this.mapearOrigemArtigo(artigo?.Origem_Registo),
      aluguerContinuo: Boolean(artigo?.Aluguer_Continuo),
      podeAceitar: false,
      podeRejeitar: false,
      podeMarcarComoDevolvido: papel === 'interessado' && estado === 'ativo',
      podeConfirmarDevolucao:
        papel === 'dono' &&
        (estado === 'ativo' || estado === 'devolucao_pendente'),
      podeCancelar: false,
      podeVerAnuncio: Boolean(artigo?.ID_Artigo),
    };
  }

  /**
   * Executa a operacao mapear estado calendario do dono.
   * @param estadoAluguer Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearEstadoCalendarioDono(estadoAluguer: string) {
    if (estadoAluguer === ESTADO_ALUGUER_RESERVADO) {
      return 'reservado';
    }

    if (estadoAluguer === ESTADO_ALUGUER_DEVOLUCAO_PENDENTE) {
      return 'devolucao_pendente';
    }

    return 'alugado';
  }

  /**
   * Executa a operacao normalizar estado do pedido de aluguer.
   * @param estadoPedido Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private normalizarEstadoPedidoAluguer(estadoPedido: string) {
    if (estadoPedido === ESTADO_PEDIDO_PENDENTE) {
      return 'pendente';
    }

    return 'cancelado';
  }

  /**
   * Executa a operacao normalizar estado do aluguer.
   * @param estadoAluguer Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private normalizarEstadoAluguer(estadoAluguer: string) {
    if (estadoAluguer === ESTADO_ALUGUER_RESERVADO) {
      return 'reservado';
    }

    if (estadoAluguer === ESTADO_ALUGUER_DEVOLUCAO_PENDENTE) {
      return 'devolucao_pendente';
    }

    if (estadoAluguer === ESTADO_ALUGUER_CONCLUIDO) {
      return 'concluido';
    }

    if (estadoAluguer === ESTADO_ALUGUER_ATIVO) {
      return 'ativo';
    }

    return 'cancelado';
  }

  /**
   * Executa a operacao mapear origem do artigo.
   * @param origemArtigo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearOrigemArtigo(origemArtigo?: string | null) {
    if (origemArtigo === OrigemRegisto.INVENTARIO_ESCOLA) {
      return 'Inventário da escola';
    }

    return 'Utilizador';
  }

  /**
   * Executa a operacao resolver descricao da outra pessoa.
   * @param artigo Dados recebidos para a operacao.
   * @param nomeDono Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private resolverDescricaoOutraPessoa(
    artigo:
      | Pick<
          ArtigoComBase,
          | 'Origem_Registo'
          | 'Utilizador_Artigo_ID_Utilizador_CriadorToUtilizador'
        >
      | null
      | undefined,
    nomeDono?: string | null,
  ) {
    if (artigo?.Origem_Registo === OrigemRegisto.INVENTARIO_ESCOLA) {
      return 'Inventário da escola';
    }

    return nomeDono ?? 'Utilizador';
  }

  /**
   * Executa a operacao resolver contacto da pessoa.
   * @param pessoa Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private resolverContactoPessoa(
    pessoa?: { Email?: string | null; Contacto?: string | null } | null,
  ) {
    return pessoa?.Email ?? pessoa?.Contacto ?? null;
  }

  /**
   * Executa a operacao ordenar meus alugueres.
   * @param itemA Dados recebidos para a operacao.
   * @param itemB Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private ordenarMeusAlugueres(
    itemA: { estado: string; inicio: string | null },
    itemB: { estado: string; inicio: string | null },
  ) {
    const prioridadeA = this.obterPrioridadeMeuAluguer(itemA.estado);
    const prioridadeB = this.obterPrioridadeMeuAluguer(itemB.estado);

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    const inicioA = itemA.inicio ?? '9999-12-31';
    const inicioB = itemB.inicio ?? '9999-12-31';

    return inicioA.localeCompare(inicioB);
  }

  /**
   * Executa a operacao obter prioridade do meu aluguer.
   * @param estado Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private obterPrioridadeMeuAluguer(estado: string) {
    const prioridades: Record<string, number> = {
      pendente: 1,
      devolucao_pendente: 2,
      ativo: 3,
      reservado: 4,
      concluido: 5,
      cancelado: 6,
    };

    return prioridades[estado] ?? 99;
  }

  /**
   * Executa a operacao formatar data calendario.
   * @param data Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private formatarDataCalendario(data: Date) {
    return data.toISOString().slice(0, 10);
  }

  /**
   * Executa a operacao eh dono do anuncio.
   * @param artigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private ehDonoDoAnuncio(
    artigo: ArtigoComBase,
    utilizador: UtilizadorAutenticado,
  ): boolean {
    return Boolean(
      artigo.ID_Utilizador_Criador &&
      artigo.ID_Utilizador_Criador === utilizador.sub,
    );
  }

  /**
   * Executa a operacao garantir acesso ao anuncio.
   * @param artigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private garantirAcessoAoAnuncio(
    artigo: ArtigoComBase,
    utilizador: UtilizadorAutenticado,
  ) {
    const dono = this.ehDonoDoAnuncio(artigo, utilizador);
    const moderador = podeModerarMarketplace(utilizador.role);

    if (!dono && !moderador) {
      throw new ForbiddenException(
        'Não tens permissão para gerir este anúncio.',
      );
    }
  }

  /**
   * Executa a operacao validar transicao de estado.
   * @param estadoAtual Dados recebidos para a operacao.
   * @param novoEstado Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarTransicaoDeEstado(
    estadoAtual: string,
    novoEstado: EstadoAnuncio,
    utilizador: UtilizadorAutenticado,
  ) {
    if (
      estadoAtual === EstadoAnuncio.REMOVIDO &&
      novoEstado === EstadoAnuncio.ATIVO
    ) {
      if (!podeModerarMarketplace(utilizador.role)) {
        throw new ForbiddenException(
          'Só a moderação pode reativar um anúncio removido.',
        );
      }
    }

    if (
      novoEstado === EstadoAnuncio.REMOVIDO &&
      !podeModerarMarketplace(utilizador.role)
    ) {
      throw new ForbiddenException(
        'A remoção administrativa deve ser feita pelo endpoint de moderação.',
      );
    }
  }

  /**
   * Executa a operacao validar anuncio disponivel para pedido de aluguer.
   * @param artigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   */

  private validarAnuncioDisponivelParaPedidoAluguer(
    artigo: ArtigoComBase,
    utilizador: UtilizadorAutenticado,
  ) {
    if (artigo.Tipo_Anuncio !== TipoAnuncio.ALUGUER) {
      throw new BadRequestException(
        'Só anúncios de aluguer podem receber pedidos de aluguer.',
      );
    }

    if (
      !artigo.Publicado_No_Marketplace ||
      artigo.Estado_Anuncio !== EstadoAnuncio.ATIVO
    ) {
      throw new BadRequestException(
        'Este anúncio não está disponível para novos pedidos de aluguer.',
      );
    }

    if (this.ehDonoDoAnuncio(artigo, utilizador)) {
      throw new BadRequestException(
        'Não podes criar um pedido de aluguer para o teu próprio anúncio.',
      );
    }
  }

  /**
   * Executa a operacao obter stock do artigo ou falhar.
   * @param artigo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private obterStockDoArtigoOuFalhar(artigo: ArtigoComBase) {
    const stockPrincipal = obterStockPrincipal(artigo);

    if (!stockPrincipal) {
      throw new BadRequestException('O anúncio não tem stock associado.');
    }

    return stockPrincipal;
  }

  /**
   * Executa a operacao validar stock disponivel para aluguer.
   * @param quantidadeAluguer Dados recebidos para a operacao.
   */

  private validarStockDisponivelParaAluguer(quantidadeAluguer: number) {
    if ((quantidadeAluguer ?? 0) < 1) {
      throw new BadRequestException(
        'Este anúncio não tem unidades disponíveis para aluguer.',
      );
    }
  }

  /**
   * Executa a operacao converter data marketplace.
   * @param valor Dados recebidos para a operacao.
   * @param campo Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private converterDataMarketplace(valor: string, campo: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [ano, mes, dia] = valor.split('-').map(Number);
      return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    }

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(`A ${campo} tem de ser uma data válida.`);
    }

    return data;
  }

  /**
   * Executa a operacao validar datas do pedido de aluguer.
   * @param dataInicioValor Dados recebidos para a operacao.
   * @param dataFimValor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarDatasPedidoAluguer(dataInicioValor: string, dataFimValor: string) {
    const dataInicio = this.converterDataMarketplace(
      dataInicioValor,
      'data de início',
    );
    const dataFim = this.converterDataMarketplace(dataFimValor, 'data de fim');

    if (dataInicio >= dataFim) {
      throw new BadRequestException(
        'A data de início tem de ser anterior à data de fim.',
      );
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataInicio < hoje || dataFim < hoje) {
      throw new BadRequestException(
        'As datas do pedido de aluguer não podem estar no passado.',
      );
    }

    return { dataInicio, dataFim };
  }

  /**
   * Executa a operacao calcular estado inicial do aluguer.
   * @param dataInicio Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private calcularEstadoInicialDoAluguer(dataInicio: Date) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioNormalizado = new Date(dataInicio);
    inicioNormalizado.setHours(0, 0, 0, 0);

    return inicioNormalizado <= hoje
      ? ESTADO_ALUGUER_ATIVO
      : ESTADO_ALUGUER_RESERVADO;
  }

  /**
   * Executa a operacao validar sobreposicao de aluguer.
   * @param idStock Dados recebidos para a operacao.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @param tx Dados recebidos para a operacao.
   */

  private async validarSobreposicaoAluguer(
    idStock: number,
    dataInicio: Date,
    dataFim: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const cliente = tx ?? this.prisma;

    const aluguerSobreposto = await cliente.aluguer_Artigo.findFirst({
      where: {
        ID_Stock: idStock,
        Estado: {
          in: ESTADOS_ALUGUER_BLOQUEANTES,
        },
        Data_Entrega: {
          lt: dataFim,
        },
        Data_Recolha_Prevista: {
          gt: dataInicio,
        },
      },
    });

    if (aluguerSobreposto) {
      throw new BadRequestException(
        'Já existe um aluguer ativo ou reservado para esse intervalo de datas.',
      );
    }
  }

  /**
   * Executa a operacao obter pedido aluguer ou falhar.
   * @param idInteresse Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterPedidoAluguerOuFalhar(idInteresse: number) {
    const pedido = await this.prisma.interesse_Artigo.findUnique({
      where: { ID_Interesse: idInteresse },
      include: this.includePedidoAluguer(),
    });

    if (!pedido) {
      throw new NotFoundException('Pedido de aluguer não encontrado.');
    }

    this.validarPedidoDeAluguer(pedido.Tipo);
    return pedido;
  }

  /**
   * Executa a operacao validar pedido de aluguer.
   * @param tipoPedido Dados recebidos para a operacao.
   */

  private validarPedidoDeAluguer(tipoPedido: string) {
    if (tipoPedido !== TipoInteresse.ALUGUER) {
      throw new BadRequestException(
        'O registo indicado não corresponde a um pedido de aluguer.',
      );
    }
  }

  /**
   * Executa a operacao validar permissao sobre pedido aluguer.
   * @param pedido Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   */

  private validarPermissaoSobrePedidoAluguer(
    pedido: Awaited<ReturnType<MarketplaceService['obterPedidoAluguerOuFalhar']>>,
    utilizador: UtilizadorAutenticado,
  ) {
    const artigo = pedido.Stock_Armazem?.Artigo;

    if (!artigo) {
      throw new BadRequestException(
        'O pedido de aluguer não tem um artigo associado.',
      );
    }

    this.validarDonoDoArtigo(artigo, utilizador);
  }

  /**
   * Executa a operacao validar pedido pendente.
   * @param estadoPedido Dados recebidos para a operacao.
   */

  private validarPedidoPendente(estadoPedido: string) {
    if (estadoPedido !== ESTADO_PEDIDO_PENDENTE) {
      throw new BadRequestException(
        'Só pedidos de aluguer pendentes podem ser alterados.',
      );
    }
  }

  /**
   * Executa a operacao obter aluguer ou falhar.
   * @param idAluguer Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterAluguerOuFalhar(idAluguer: number) {
    const aluguer = await this.prisma.aluguer_Artigo.findUnique({
      where: { ID_Aluguer: idAluguer },
      include: this.includeAluguerArtigo(),
    });

    if (!aluguer) {
      throw new NotFoundException('Aluguer não encontrado.');
    }

    return aluguer;
  }

  /**
   * Executa a operacao validar dono do artigo.
   * @param artigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   */

  private validarDonoDoArtigo(
    artigo: Pick<ArtigoComBase, 'ID_Utilizador_Criador' | 'ID_Artigo'>,
    utilizador: UtilizadorAutenticado,
  ) {
    if (artigo.ID_Utilizador_Criador !== utilizador.sub) {
      throw new ForbiddenException(
        'Só o dono do anúncio pode executar esta operação.',
      );
    }
  }

  /**
   * Mantém compatibilidade de leitura para registos antigos e impede novas escritas com tipos legados.
   * @param tipoAnuncio Dados recebidos para a operacao.
   */
  private validarTipoAnuncioParaEscrita(tipoAnuncio: TipoAnuncio | string) {
    if (
      tipoAnuncio !== TipoAnuncio.VENDA &&
      tipoAnuncio !== TipoAnuncio.ALUGUER
    ) {
      throw new BadRequestException(
        'Novos anúncios só podem ter tipo "venda" ou "aluguer".',
      );
    }
  }

  /**
   * Garante que novas publicações não misturam venda e aluguer no mesmo anúncio.
   * @param quantidadeVenda Dados recebidos para a operacao.
   * @param quantidadeAluguer Dados recebidos para a operacao.
   */
  private validarModoExclusivoDePublicacao(
    quantidadeVenda?: number,
    quantidadeAluguer?: number,
  ) {
    if ((quantidadeVenda ?? 0) > 0 && (quantidadeAluguer ?? 0) > 0) {
      throw new BadRequestException(
        'O artigo deve ser publicado apenas como venda ou apenas como aluguer.',
      );
    }
  }

  /**
   * Executa a operacao criar registo moderacao.
   * @param tx Dados recebidos para a operacao.
   * @param params Dados recebidos para a operacao.
   * @returns Resultado da operacao.
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
