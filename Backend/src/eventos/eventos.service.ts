import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Evento, EventoComunicacao, Prisma } from '@prisma/client';
import 'multer';

import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import { Role } from '../auth/enums/roles.enum';

import {
  garantirEventoVisivelPublicamente,
  garantirPermissaoGestaoEventos,
} from './eventos.permissoes';

import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto';
import { CriarComunicacaoEventoDto } from './dto/criar-comunicacao-evento.dto';
import { ListarEventosPublicosDto } from './dto/listar-eventos-publicos.dto';
import { ListarEventosGestaoDto } from './dto/listar-eventos-gestao.dto';
import { TipoEvento } from './enums/tipo-evento.enum';
/**
 * Servico responsavel pela logica de Eventos.
 */

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blobsService: BlobsService,
  ) {}

  /**
   * Executa a operacao listar eventos publicos.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarEventosPublicos(filtros: ListarEventosPublicosDto) {
    const where = this.construirWhereEventosPublicos(filtros);

    const eventos = await this.prisma.evento.findMany({
      where,
      take: filtros.limite ?? 20,
      orderBy: [{ Data_Inicio: 'asc' }, { ID_Evento: 'desc' }],
    });

    return eventos.map((evento) => this.mapearEvento(evento));
  }

  /**
   * Executa a operacao listar eventos login toast.
   * @returns Resultado da operacao.
   */

  async listarEventosLoginToast() {
    const agora = new Date();

    const eventos = await this.prisma.evento.findMany({
      where: {
        Publico: true,
        Publicado: true,
        Ativo: true,
        Destaque_Login: true,
        OR: [
          {
            Data_Fim: {
              gte: agora,
            },
          },
          {
            Data_Fim: null,
            Data_Inicio: {
              gte: agora,
            },
          },
        ],
      },
      take: 3,
      orderBy: [{ Data_Inicio: 'asc' }, { ID_Evento: 'desc' }],
    });

    return eventos.map((evento) => this.mapearEventoResumo(evento));
  }

  /**
   * Executa a operacao obter evento publico por slug.
   * @param slug Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async obterEventoPublicoPorSlug(slug: string) {
    const evento = await this.prisma.evento.findUnique({
      where: {
        Slug: slug,
      },
    });

    garantirEventoVisivelPublicamente(evento);

    return this.mapearEvento(evento);
  }

  /**
   * Executa a operacao listar eventos gestao.
   * @param filtros Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarEventosGestao(
    filtros: ListarEventosGestaoDto,
    utilizador: UtilizadorAutenticado,
  ) {
    garantirPermissaoGestaoEventos(utilizador.role);

    const where = this.construirWhereEventosGestao(filtros);

    const eventos = await this.prisma.evento.findMany({
      where,
      take: filtros.limite ?? 50,
      orderBy: [{ Data_Atualizacao: 'desc' }, { ID_Evento: 'desc' }],
    });

    return eventos.map((evento) => this.mapearEvento(evento));
  }

  /**
   * Executa a operacao obter evento gestao.
   * @param idEvento Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async obterEventoGestao(idEvento: number, utilizador: UtilizadorAutenticado) {
    garantirPermissaoGestaoEventos(utilizador.role);

    const evento = await this.obterEventoOuFalhar(idEvento);

    return this.mapearEvento(evento);
  }

  /**
   * Executa a operacao criar evento.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param imagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarEvento(
    dto: CriarEventoDto,
    utilizador: UtilizadorAutenticado,
    imagem?: Express.Multer.File,
  ) {
    this.logger.log(
      `A criar evento titulo="${dto.titulo}" userId=${utilizador.sub} comImagem=${Boolean(imagem)}`,
    );

    garantirPermissaoGestaoEventos(utilizador.role);

    const dataInicio = this.converterData(
      dto.dataInicio,
      'A data de início é inválida.',
    );

    const dataFim = dto.dataFim
      ? this.converterData(dto.dataFim, 'A data de fim é inválida.')
      : null;

    this.validarIntervaloDatas(dataInicio, dataFim);

    const slug = await this.gerarSlugUnico(dto.slug?.trim() || dto.titulo);

    let urlImagem: string | null = null;

    try {
      urlImagem = imagem
        ? await this.guardarImagemEvento(imagem, slug)
        : this.normalizarTexto(dto.imagem);

      const dadosCriacao = this.construirDadosCriacaoEvento(
        dto,
        utilizador,
        slug,
        dataInicio,
        dataFim,
        urlImagem,
      );

      const evento = await this.prisma.evento.create({
        data: dadosCriacao,
      });

      this.logger.log(
        `Evento criado idEvento=${evento.ID_Evento} slug=${evento.Slug} userId=${utilizador.sub}`,
      );
      return this.mapearEvento(evento);
    } catch (error) {
      this.logger.error(
        `Erro ao criar evento titulo="${dto.titulo}" userId=${utilizador.sub}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (imagem && urlImagem) {
        await this.apagarImagemEventoPorUrl(urlImagem);
      }

      throw error;
    }
  }

  /**
   * Executa a operacao atualizar evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param imagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async atualizarEvento(
    idEvento: number,
    dto: AtualizarEventoDto,
    utilizador: UtilizadorAutenticado,
    imagem?: Express.Multer.File,
  ) {
    this.logger.log(
      `A atualizar evento idEvento=${idEvento} userId=${utilizador.sub} comImagem=${Boolean(imagem)}`,
    );

    garantirPermissaoGestaoEventos(utilizador.role);

    const eventoAtual = await this.obterEventoOuFalhar(idEvento);

    const dadosAtualizacao = await this.construirDadosAtualizacaoEvento(
      idEvento,
      dto,
      utilizador,
      eventoAtual,
    );

    let novaImagemUrl: string | null | undefined;
    let houveAlteracaoImagem = false;

    if (imagem) {
      novaImagemUrl = await this.guardarImagemEvento(
        imagem,
        dadosAtualizacao.slugFinal,
      );

      dadosAtualizacao.data.Imagem = novaImagemUrl;
      houveAlteracaoImagem = true;
    } else if (dto.imagem !== undefined) {
      novaImagemUrl = this.normalizarTexto(dto.imagem);
      dadosAtualizacao.data.Imagem = novaImagemUrl;
      houveAlteracaoImagem = novaImagemUrl !== eventoAtual.Imagem;
    }

    try {
      const evento = await this.prisma.evento.update({
        where: {
          ID_Evento: idEvento,
        },
        data: dadosAtualizacao.data,
      });

      if (
        houveAlteracaoImagem &&
        eventoAtual.Imagem &&
        eventoAtual.Imagem !== evento.Imagem
      ) {
        await this.apagarImagemEventoPorUrl(eventoAtual.Imagem);
      }

      this.logger.log(
        `Evento atualizado idEvento=${idEvento} userId=${utilizador.sub}`,
      );
      return this.mapearEvento(evento);
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar evento idEvento=${idEvento} userId=${utilizador.sub}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (imagem && novaImagemUrl) {
        await this.apagarImagemEventoPorUrl(novaImagemUrl);
      }

      throw error;
    }
  }

  /**
   * Executa a operacao remover evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async removerEvento(idEvento: number, utilizador: UtilizadorAutenticado) {
    this.logger.log(`A remover evento idEvento=${idEvento} userId=${utilizador.sub}`);

    garantirPermissaoGestaoEventos(utilizador.role);

    await this.obterEventoOuFalhar(idEvento);

    const evento = await this.prisma.evento.update({
      where: {
        ID_Evento: idEvento,
      },
      data: {
        Ativo: false,
        Data_Remocao: new Date(),
        ID_Utilizador_Remocao: utilizador.sub,
        Data_Atualizacao: new Date(),
        ID_Utilizador_Atualizacao: utilizador.sub,
      },
    });

    this.logger.log(`Evento removido idEvento=${idEvento} userId=${utilizador.sub}`);
    return this.mapearEvento(evento);
  }

  /**
   * Executa a operacao reativar evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async reativarEvento(idEvento: number, utilizador: UtilizadorAutenticado) {
    this.logger.log(`A reativar evento idEvento=${idEvento} userId=${utilizador.sub}`);

    garantirPermissaoGestaoEventos(utilizador.role);

    await this.obterEventoOuFalhar(idEvento);

    const evento = await this.prisma.evento.update({
      where: {
        ID_Evento: idEvento,
      },
      data: {
        Ativo: true,
        Data_Remocao: null,
        ID_Utilizador_Remocao: null,
        Data_Atualizacao: new Date(),
        ID_Utilizador_Atualizacao: utilizador.sub,
      },
    });

    this.logger.log(`Evento reativado idEvento=${idEvento} userId=${utilizador.sub}`);
    return this.mapearEvento(evento);
  }

  /**
   * Executa a operacao criar comunicacao do evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async criarComunicacaoEvento(
    idEvento: number,
    dto: CriarComunicacaoEventoDto,
    utilizador: UtilizadorAutenticado,
  ) {
    this.logger.log(
      `A criar comunicacao de evento idEvento=${idEvento} userId=${utilizador.sub}`,
    );

    this.validarPermissaoGestaoComunicacoes(utilizador.role);
    await this.obterEventoOuFalhar(idEvento);

    const titulo = this.normalizarTextoObrigatorio(
      dto.titulo,
      'O titulo da comunicacao do evento e obrigatorio.',
    );
    const mensagem = this.normalizarTextoObrigatorio(
      dto.mensagem,
      'A mensagem da comunicacao do evento e obrigatoria.',
    );

    const comunicacao = await this.prisma.eventoComunicacao.create({
      data: {
        ID_Evento: idEvento,
        ID_Utilizador_Criador: utilizador.sub,
        Titulo: titulo,
        Mensagem: mensagem,
        Tipo: dto.tipo?.trim() || 'GERAL',
        Importante: dto.importante ?? false,
        Ativo: true,
        Data_Criacao: new Date(),
      },
      include: {
        Utilizador: {
          select: {
            ID_Utilizador: true,
            Pessoa: {
              select: {
                Nome: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Comunicacao de evento criada idEvento=${idEvento} idComunicacao=${comunicacao.ID_Evento_Comunicacao} userId=${utilizador.sub}`,
    );

    return {
      mensagem: 'Comunicacao do evento criada com sucesso.',
      comunicacao: this.mapearComunicacaoEvento(comunicacao),
    };
  }

  /**
   * Executa a operacao listar comunicacoes ativas do evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarComunicacoesEvento(
    idEvento: number,
    utilizador: UtilizadorAutenticado,
  ) {
    this.validarPermissaoConsultaComunicacoes(utilizador.role);
    await this.obterEventoOuFalhar(idEvento);

    const comunicacoes = await this.prisma.eventoComunicacao.findMany({
      where: {
        ID_Evento: idEvento,
        Ativo: true,
      },
      include: {
        Utilizador: {
          select: {
            ID_Utilizador: true,
            Pessoa: {
              select: {
                Nome: true,
              },
            },
          },
        },
      },
      orderBy: [{ Importante: 'desc' }, { Data_Criacao: 'desc' }],
    });

    return comunicacoes.map((comunicacao) =>
      this.mapearComunicacaoEvento(comunicacao),
    );
  }

  /**
 * Remove uma comunicação de evento através de soft delete.
 *
 * Regras:
 * - Coordenadores podem remover qualquer comunicação;
 * - Professores só podem remover comunicações criadas por si;
 * - A comunicação não é apagada fisicamente da base de dados;
 * - O registo fica inativo e com data de remoção preenchida.
 *
 * @param idComunicacao Identificador da comunicação.
 * @param utilizador Utilizador autenticado que está a realizar a operação.
 * @returns Comunicação removida.
 */
async removerComunicacaoEvento(
  idComunicacao: number,
  utilizador: UtilizadorAutenticado,
) {
  this.logger.log(
    `A remover comunicacao de evento idComunicacao=${idComunicacao} userId=${utilizador.sub}`,
  );

  this.validarPermissaoGestaoComunicacoes(utilizador.role);

  const comunicacaoAtual =
    await this.obterComunicacaoEventoOuFalhar(idComunicacao);

  /**
   * Regra de autorização:
   * - O coordenador pode remover qualquer comunicação;
   * - O professor só pode remover comunicações criadas por ele próprio.
   */
  if (
    utilizador.role === Role.PROFESSOR &&
    comunicacaoAtual.ID_Utilizador_Criador !== utilizador.sub
  ) {
    throw new ForbiddenException(
      'Apenas pode remover comunicações criadas por si.',
    );
  }

  const comunicacao = await this.prisma.eventoComunicacao.update({
    where: {
      ID_Evento_Comunicacao: idComunicacao,
    },
    data: {
      Ativo: false,
      Data_Remocao: new Date(),
      Data_Atualizacao: new Date(),
    },
    include: {
      Utilizador: {
        select: {
          ID_Utilizador: true,
          Pessoa: {
            select: {
              Nome: true,
            },
          },
        },
      },
    },
  });

  this.logger.log(
    `Comunicacao de evento removida idComunicacao=${idComunicacao} userId=${utilizador.sub}`,
  );

  return {
    mensagem: 'Comunicacao do evento removida com sucesso.',
    comunicacao: this.mapearComunicacaoEvento(comunicacao),
  };
}

  /**
   * Executa a operacao construir where eventos publicos.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private construirWhereEventosPublicos(
    filtros: ListarEventosPublicosDto,
  ): Prisma.EventoWhereInput {
    const where: Prisma.EventoWhereInput = {
      Publico: true,
      Publicado: true,
      Ativo: true,
    };

    const and: Prisma.EventoWhereInput[] = [];

    if (filtros.tipo) {
      where.Tipo = filtros.tipo;
    }

    if (filtros.destaque !== undefined) {
      where.Destaque = filtros.destaque;
    }

    const apenasFuturos = filtros.apenasFuturos ?? true;

    if (apenasFuturos) {
      and.push(this.construirFiltroEventosAtuaisOuFuturos());
    }

    const filtroPesquisa = this.construirFiltroPesquisa(filtros.pesquisa);

    if (filtroPesquisa) {
      and.push(filtroPesquisa);
    }

    if (and.length > 0) {
      where.AND = and;
    }

    return where;
  }

  /**
   * Executa a operacao construir where eventos gestao.
   * @param filtros Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private construirWhereEventosGestao(
    filtros: ListarEventosGestaoDto,
  ): Prisma.EventoWhereInput {
    const where: Prisma.EventoWhereInput = {};
    const and: Prisma.EventoWhereInput[] = [];

    if (filtros.tipo) {
      where.Tipo = filtros.tipo;
    }

    if (filtros.publico !== undefined) {
      where.Publico = filtros.publico;
    }

    if (filtros.publicado !== undefined) {
      where.Publicado = filtros.publicado;
    }

    if (filtros.destaque !== undefined) {
      where.Destaque = filtros.destaque;
    }

    if (filtros.destaqueLogin !== undefined) {
      where.Destaque_Login = filtros.destaqueLogin;
    }

    if (filtros.ativo !== undefined) {
      where.Ativo = filtros.ativo;
    }

    const filtroPesquisa = this.construirFiltroPesquisa(filtros.pesquisa);

    if (filtroPesquisa) {
      and.push(filtroPesquisa);
    }

    if (and.length > 0) {
      where.AND = and;
    }

    return where;
  }

  /**
   * Executa a operacao construir filtro pesquisa.
   * @param pesquisa Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private construirFiltroPesquisa(
    pesquisa?: string,
  ): Prisma.EventoWhereInput | null {
    const textoPesquisa = pesquisa?.trim();

    if (!textoPesquisa) {
      return null;
    }

    return {
      OR: [
        { Titulo: { contains: textoPesquisa } },
        { Resumo: { contains: textoPesquisa } },
        { Descricao: { contains: textoPesquisa } },
        { Local: { contains: textoPesquisa } },
      ],
    };
  }

  /**
   * Executa a operacao construir filtro eventos atuais ou futuros.
   * @returns Resultado da operacao.
   */

  private construirFiltroEventosAtuaisOuFuturos(): Prisma.EventoWhereInput {
    const agora = new Date();

    return {
      OR: [
        {
          Data_Fim: {
            gte: agora,
          },
        },
        {
          Data_Fim: null,
          Data_Inicio: {
            gte: agora,
          },
        },
      ],
    };
  }

  /**
   * Executa a operacao construir dados criacao evento.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param slug Dados recebidos para a operacao.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @param urlImagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private construirDadosCriacaoEvento(
    dto: CriarEventoDto,
    utilizador: UtilizadorAutenticado,
    slug: string,
    dataInicio: Date,
    dataFim: Date | null,
    urlImagem: string | null,
  ): Prisma.EventoUncheckedCreateInput {
    return {
      Titulo: dto.titulo.trim(),
      Slug: slug,
      Resumo: this.normalizarTexto(dto.resumo),
      Descricao: this.normalizarTexto(dto.descricao),
      Tipo: dto.tipo ?? TipoEvento.EVENTO,
      Local: this.normalizarTexto(dto.local),
      Imagem: urlImagem,
      Data_Inicio: dataInicio,
      Data_Fim: dataFim,
      Publico: dto.publico ?? true,
      Publicado: dto.publicado ?? false,
      Destaque: dto.destaque ?? false,
      Destaque_Login: dto.destaqueLogin ?? false,
      Ativo: true,
      ID_Utilizador_Criador: utilizador.sub,
      Data_Criacao: new Date(),
      Data_Atualizacao: new Date(),
    };
  }

  /**
   * Executa a operacao construir dados atualizacao evento.
   * @param idEvento Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @param utilizador Dados recebidos para a operacao.
   * @param eventoAtual Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async construirDadosAtualizacaoEvento(
    idEvento: number,
    dto: AtualizarEventoDto,
    utilizador: UtilizadorAutenticado,
    eventoAtual: Evento,
  ): Promise<{
    data: Prisma.EventoUncheckedUpdateInput;
    slugFinal: string;
  }> {
    const dataInicio = dto.dataInicio
      ? this.converterData(dto.dataInicio, 'A data de início é inválida.')
      : eventoAtual.Data_Inicio;

    const dataFim =
      dto.dataFim !== undefined
        ? dto.dataFim
          ? this.converterData(dto.dataFim, 'A data de fim é inválida.')
          : null
        : eventoAtual.Data_Fim;

    this.validarIntervaloDatas(dataInicio, dataFim);

    const data: Prisma.EventoUncheckedUpdateInput = {
      Data_Inicio: dataInicio,
      Data_Fim: dataFim,
      Data_Atualizacao: new Date(),
      ID_Utilizador_Atualizacao: utilizador.sub,
    };

    let slugFinal = eventoAtual.Slug;

    if (dto.titulo !== undefined) {
      data.Titulo = dto.titulo.trim();
    }

    if (dto.slug !== undefined) {
      slugFinal = await this.gerarSlugUnico(dto.slug, idEvento);
      data.Slug = slugFinal;
    }

    if (dto.resumo !== undefined) {
      data.Resumo = this.normalizarTexto(dto.resumo);
    }

    if (dto.descricao !== undefined) {
      data.Descricao = this.normalizarTexto(dto.descricao);
    }

    if (dto.tipo !== undefined) {
      data.Tipo = dto.tipo;
    }

    if (dto.local !== undefined) {
      data.Local = this.normalizarTexto(dto.local);
    }

    if (dto.publico !== undefined) {
      data.Publico = dto.publico;
    }

    if (dto.publicado !== undefined) {
      data.Publicado = dto.publicado;
    }

    if (dto.destaque !== undefined) {
      data.Destaque = dto.destaque;
    }

    if (dto.destaqueLogin !== undefined) {
      data.Destaque_Login = dto.destaqueLogin;
    }

    return {
      data,
      slugFinal,
    };
  }

  /**
   * Executa a operacao validar permissao de gestao das comunicacoes.
   * @param role Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarPermissaoGestaoComunicacoes(role: Role): void {
    if (role !== Role.COORDENADOR && role !== Role.PROFESSOR) {
      throw new ForbiddenException(
        'Apenas coordenadores e professores podem gerir comunicacoes do evento.',
      );
    }
  }

  /**
   * Executa a operacao validar permissao de consulta das comunicacoes.
   * @param role Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarPermissaoConsultaComunicacoes(role: Role): void {
    if (
      role !== Role.COORDENADOR &&
      role !== Role.PROFESSOR &&
      role !== Role.ENC_EDUCACAO
    ) {
      throw new ForbiddenException(
        'Sem permissao para consultar comunicacoes do evento.',
      );
    }
  }

  /**
   * Executa a operacao obter evento ou falhar.
   * @param idEvento Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterEventoOuFalhar(idEvento: number): Promise<Evento> {
    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      throw new BadRequestException('ID do evento inválido.');
    }

    const evento = await this.prisma.evento.findUnique({
      where: {
        ID_Evento: idEvento,
      },
    });

    if (!evento) {
      throw new NotFoundException('Evento não encontrado.');
    }

    return evento;
  }

  /**
   * Executa a operacao obter comunicacao do evento ou falhar.
   * @param idComunicacao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterComunicacaoEventoOuFalhar(
    idComunicacao: number,
  ): Promise<EventoComunicacao> {
    if (!Number.isInteger(idComunicacao) || idComunicacao <= 0) {
      throw new BadRequestException('ID da comunicacao do evento invalido.');
    }

    const comunicacao = await this.prisma.eventoComunicacao.findUnique({
      where: {
        ID_Evento_Comunicacao: idComunicacao,
      },
    });

    if (!comunicacao) {
      throw new NotFoundException('Comunicacao do evento nao encontrada.');
    }

    return comunicacao;
  }

  /**
   * Executa a operacao converter data.
   * @param valor Dados recebidos para a operacao.
   * @param mensagemErro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private converterData(valor: string, mensagemErro: string): Date {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(mensagemErro);
    }

    return data;
  }

  /**
   * Executa a operacao validar intervalo datas.
   * @param dataInicio Dados recebidos para a operacao.
   * @param dataFim Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarIntervaloDatas(dataInicio: Date, dataFim: Date | null): void {
    if (dataFim && dataFim < dataInicio) {
      throw new BadRequestException(
        'A data de fim não pode ser anterior à data de início.',
      );
    }
  }

  /**
   * Executa a operacao normalizar texto.
   * @param valor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private normalizarTexto(valor?: string | null): string | null {
    if (valor === undefined || valor === null) {
      return null;
    }

    const texto = valor.trim();

    return texto.length > 0 ? texto : null;
  }

  /**
   * Executa a operacao normalizar texto obrigatorio.
   * @param valor Dados recebidos para a operacao.
   * @param mensagemErro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private normalizarTextoObrigatorio(
    valor: string,
    mensagemErro: string,
  ): string {
    const texto = valor.trim();

    if (!texto) {
      throw new BadRequestException(mensagemErro);
    }

    return texto;
  }

  /**
   * Executa a operacao gerar slug unico.
   * @param valorBase Dados recebidos para a operacao.
   * @param idEventoIgnorar Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async gerarSlugUnico(
    valorBase: string,
    idEventoIgnorar?: number,
  ): Promise<string> {
    const base = this.criarSlug(valorBase);

    let slug = base;
    let contador = 2;

    while (await this.existeSlug(slug, idEventoIgnorar)) {
      slug = `${base}-${contador}`;
      contador++;
    }

    return slug;
  }

  /**
   * Executa a operacao existe slug.
   * @param slug Dados recebidos para a operacao.
   * @param idEventoIgnorar Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async existeSlug(
    slug: string,
    idEventoIgnorar?: number,
  ): Promise<boolean> {
    const where: Prisma.EventoWhereInput = {
      Slug: slug,
    };

    if (idEventoIgnorar) {
      where.ID_Evento = {
        not: idEventoIgnorar,
      };
    }

    const evento = await this.prisma.evento.findFirst({
      where,
      select: {
        ID_Evento: true,
      },
    });

    return Boolean(evento);
  }

  /**
   * Executa a operacao criar slug.
   * @param valor Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private criarSlug(valor: string): string {
    const slug = valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      throw new BadRequestException(
        'Não foi possível gerar um slug válido para o evento.',
      );
    }

    return slug.slice(0, 160);
  }

  /**
   * Executa a operacao validar imagem evento.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private validarImagemEvento(file: Express.Multer.File): void {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    const tamanhoMaximoMb = 5;
    const tamanhoMaximoBytes = tamanhoMaximoMb * 1024 * 1024;

    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException(
        'A imagem do evento tem de ser JPG, PNG ou WEBP.',
      );
    }

    if (file.size > tamanhoMaximoBytes) {
      throw new BadRequestException(
        `A imagem do evento não pode ultrapassar ${tamanhoMaximoMb}MB.`,
      );
    }
  }

  /**
   * Executa a operacao guardar imagem evento.
   * @param file Dados recebidos para a operacao.
   * @param slug Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async guardarImagemEvento(
    file: Express.Multer.File,
    slug: string,
  ): Promise<string> {
    this.validarImagemEvento(file);

    const nomeFicheiro = `evento-${slug}-${Date.now()}`;

    return this.blobsService.uploadFicheiro('eventos', file, nomeFicheiro);
  }

  /**
   * Executa a operacao obter nome blob evento por url.
   * @param urlImagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private obterNomeBlobEventoPorUrl(urlImagem?: string | null): string | null {
    if (!urlImagem) {
      return null;
    }

    try {
      const url = new URL(urlImagem);

      const partesCaminho = url.pathname
        .split('/')
        .filter((parte) => parte.length > 0);

      const nomeContainer = partesCaminho[0];

      if (nomeContainer !== 'eventos') {
        return null;
      }

      const nomeFicheiro = partesCaminho.slice(1).join('/');

      return nomeFicheiro ? decodeURIComponent(nomeFicheiro) : null;
    } catch {
      return null;
    }
  }

  /**
   * Executa a operacao apagar imagem evento por url.
   * @param urlImagem Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async apagarImagemEventoPorUrl(
    urlImagem?: string | null,
  ): Promise<void> {
    const nomeFicheiro = this.obterNomeBlobEventoPorUrl(urlImagem);

    if (!nomeFicheiro) {
      return;
    }

    await this.blobsService.apagarFicheiro('eventos', nomeFicheiro);
  }

  /**
   * Executa a operacao mapear evento.
   * @param evento Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearEvento(evento: Evento) {
    return {
      id: evento.ID_Evento,
      titulo: evento.Titulo,
      slug: evento.Slug,
      resumo: evento.Resumo,
      descricao: evento.Descricao,
      tipo: evento.Tipo,
      local: evento.Local,
      imagem: evento.Imagem,
      dataInicio: evento.Data_Inicio,
      dataFim: evento.Data_Fim,
      publico: evento.Publico,
      publicado: evento.Publicado,
      destaque: evento.Destaque,
      destaqueLogin: evento.Destaque_Login,
      ativo: evento.Ativo,
      idUtilizadorCriador: evento.ID_Utilizador_Criador,
      idUtilizadorAtualizacao: evento.ID_Utilizador_Atualizacao,
      idUtilizadorRemocao: evento.ID_Utilizador_Remocao,
      dataCriacao: evento.Data_Criacao,
      dataAtualizacao: evento.Data_Atualizacao,
      dataRemocao: evento.Data_Remocao,
    };
  }

  /**
   * Executa a operacao mapear evento resumo.
   * @param evento Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearEventoResumo(evento: Evento) {
    return {
      id: evento.ID_Evento,
      titulo: evento.Titulo,
      slug: evento.Slug,
      resumo: evento.Resumo,
      tipo: evento.Tipo,
      local: evento.Local,
      imagem: evento.Imagem,
      dataInicio: evento.Data_Inicio,
      dataFim: evento.Data_Fim,
    };
  }

  /**
   * Executa a operacao mapear comunicacao do evento.
   * @param comunicacao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private mapearComunicacaoEvento(
    comunicacao: EventoComunicacao & {
      Utilizador?: {
        ID_Utilizador: number;
        Pessoa?: {
          Nome: string;
        } | null;
      };
    },
  ) {
    return {
      id: comunicacao.ID_Evento_Comunicacao,
      idEvento: comunicacao.ID_Evento,
      titulo: comunicacao.Titulo,
      mensagem: comunicacao.Mensagem,
      tipo: comunicacao.Tipo,
      importante: comunicacao.Importante,
      ativo: comunicacao.Ativo,
      dataCriacao: comunicacao.Data_Criacao,
      dataAtualizacao: comunicacao.Data_Atualizacao,
      dataRemocao: comunicacao.Data_Remocao,
      criador: comunicacao.Utilizador
        ? {
            id: comunicacao.Utilizador.ID_Utilizador,
            nome: comunicacao.Utilizador.Pessoa?.Nome ?? null,
          }
        : null,
    };
  }
}
