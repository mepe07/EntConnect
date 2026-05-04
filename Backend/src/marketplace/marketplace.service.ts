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
/**
 * Servico responsavel pela logica de Marketplace.
 */

@Injectable()
export class MarketplaceService {
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
    const urlFoto = file
      ? await this.guardarFotoMarketplace(
          file,
          `anuncio_${utilizador.sub}_${Date.now()}`,
        )
      : null;

    const dataAtual = new Date();

    return this.prisma.$transaction(async (tx) => {
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
    garantirAcessoAoInventarioDaEscola(utilizador.role);

    const artigo = await this.obterArtigoOuFalhar(dto.idArtigo);

    const dono = this.ehDonoDoAnuncio(artigo, utilizador);
    if (!dono) {
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
    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    this.garantirAcessoAoAnuncio(artigo, utilizador);
    this.validarTransicaoDeEstado(
      artigo.Estado_Anuncio,
      dto.estado,
      utilizador,
    );

    return this.prisma.artigo.update({
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
  }

  /**
   * Executa a operacao remover anuncio.
   * @param idArtigo Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async removerAnuncio(idArtigo: number, utilizador: UtilizadorAutenticado) {
    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    if (!this.ehDonoDoAnuncio(artigo, utilizador)) {
      throw new ForbiddenException(
        'Só o dono do anúncio o pode remover diretamente.',
      );
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
    const artigo = await this.obterArtigoOuFalhar(idArtigo);

    if (
      !artigo.Publicado_No_Marketplace ||
      artigo.Estado_Anuncio !== EstadoAnuncio.ATIVO
    ) {
      throw new BadRequestException(
        'Este anúncio não está disponível para novos contactos.',
      );
    }

    if (this.ehDonoDoAnuncio(artigo, utilizador)) {
      throw new BadRequestException(
        'Não podes registar interesse no teu próprio anúncio.',
      );
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
