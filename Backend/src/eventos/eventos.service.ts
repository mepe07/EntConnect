// Ficheiro: Backend/src/eventos/eventos.service.ts

import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Evento, Prisma } from '@prisma/client';
import 'multer';

import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';

import {
    garantirEventoVisivelPublicamente,
    garantirPermissaoGestaoEventos,
} from './eventos.permissoes';

import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto';
import { ListarEventosPublicosDto } from './dto/listar-eventos-publicos.dto';
import { ListarEventosGestaoDto } from './dto/listar-eventos-gestao.dto';
import { TipoEvento } from './enums/tipo-evento.enum';

@Injectable()
export class EventosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly blobsService: BlobsService,
    ) { }

    // ========================================================================
    // 1. ENDPOINTS PÚBLICOS
    // ========================================================================

    /**
     * Lista eventos públicos para a página /eventos, dashboard e outras zonas públicas.
     *
     * Regras:
     * - apenas eventos públicos;
     * - apenas eventos publicados;
     * - apenas eventos ativos;
     * - por defeito, apenas eventos atuais/futuros.
     */
    async listarEventosPublicos(filtros: ListarEventosPublicosDto) {
        const where = this.construirWhereEventosPublicos(filtros);

        const eventos = await this.prisma.evento.findMany({
            where,
            take: filtros.limite ?? 20,
            orderBy: [
                { Data_Inicio: 'asc' },
                { ID_Evento: 'desc' },
            ],
        });

        return eventos.map((evento) => this.mapearEvento(evento));
    }

    /**
     * Lista eventos que podem aparecer no toast do login.
     *
     * Regra:
     * - público;
     * - publicado;
     * - ativo;
     * - marcado como Destaque_Login;
     * - evento ainda atual/futuro.
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
            orderBy: [
                { Data_Inicio: 'asc' },
                { ID_Evento: 'desc' },
            ],
        });

        return eventos.map((evento) => this.mapearEventoResumo(evento));
    }

    /**
     * Obtém o detalhe público de um evento pelo slug.
     *
     * Nota:
     * A validação pública está no ficheiro eventos.permissoes.ts.
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

    // ========================================================================
    // 2. GESTÃO INTERNA
    // ========================================================================

    /**
     * Lista eventos para a área interna de gestão.
     *
     * Apenas a coordenadora pode consultar esta lista.
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
            orderBy: [
                { Data_Atualizacao: 'desc' },
                { ID_Evento: 'desc' },
            ],
        });

        return eventos.map((evento) => this.mapearEvento(evento));
    }

    /**
     * Obtém um evento específico para gestão interna.
     */
    async obterEventoGestao(
        idEvento: number,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const evento = await this.obterEventoOuFalhar(idEvento);

        return this.mapearEvento(evento);
    }

    /**
     * Cria um novo evento.
     *
     * Se existir imagem:
     * - primeiro faz upload para o Blob;
     * - depois cria o registo na BD;
     * - se a BD falhar, apaga a imagem nova para não deixar lixo no Blob.
     */
    async criarEvento(
        dto: CriarEventoDto,
        utilizador: UtilizadorAutenticado,
        imagem?: Express.Multer.File,
    ) {
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

            return this.mapearEvento(evento);
        } catch (error) {
            /*
             * Se o upload da imagem correu bem mas a criação na BD falhou,
             * apagamos a imagem nova para não deixar ficheiros órfãos no Blob.
             */
            if (imagem && urlImagem) {
                await this.apagarImagemEventoPorUrl(urlImagem);
            }

            throw error;
        }
    }

    /**
     * Atualiza um evento existente.
     *
     * Se vier nova imagem:
     * - faz upload da nova;
     * - atualiza a BD;
     * - só depois apaga a imagem antiga;
     * - se a BD falhar, apaga a imagem nova.
     */
    async atualizarEvento(
        idEvento: number,
        dto: AtualizarEventoDto,
        utilizador: UtilizadorAutenticado,
        imagem?: Express.Multer.File,
    ) {
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

        /*
         * Se veio ficheiro de imagem, tem prioridade sobre dto.imagem.
         * Isto permite ao frontend enviar FormData com ficheiro.
         */
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

            /*
             * Só apagamos a imagem antiga depois do update da BD correr bem.
             * Assim nunca ficamos com a BD a apontar para uma imagem apagada.
             */
            if (
                houveAlteracaoImagem &&
                eventoAtual.Imagem &&
                eventoAtual.Imagem !== evento.Imagem
            ) {
                await this.apagarImagemEventoPorUrl(eventoAtual.Imagem);
            }

            return this.mapearEvento(evento);
        } catch (error) {
            /*
             * Se fizemos upload de imagem nova mas o update falhou,
             * apagamos a imagem nova para não ficar órfã.
             */
            if (imagem && novaImagemUrl) {
                await this.apagarImagemEventoPorUrl(novaImagemUrl);
            }

            throw error;
        }
    }

    /**
     * Remove um evento através de soft delete.
     *
     * Nota:
     * Não apagamos a imagem do Blob aqui, porque o evento pode ser reativado.
     */
    async removerEvento(
        idEvento: number,
        utilizador: UtilizadorAutenticado,
    ) {
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

        return this.mapearEvento(evento);
    }

    /**
     * Reativa um evento removido.
     *
     * Como o remove é soft delete, a imagem continua disponível.
     */
    async reativarEvento(
        idEvento: number,
        utilizador: UtilizadorAutenticado,
    ) {
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

        return this.mapearEvento(evento);
    }

    // ========================================================================
    // 3. HELPERS DE FILTROS / QUERY
    // ========================================================================

    /**
     * Constrói os filtros da listagem pública.
     *
     * Esta função concentra a construção do where para não deixar o método
     * listarEventosPublicos cheio de ifs.
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
     * Constrói os filtros da listagem interna de gestão.
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
     * Cria um filtro para procurar por título, resumo, descrição ou local.
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
     * Cria a regra de eventos atuais ou futuros.
     *
     * Um evento é considerado válido se:
     * - tem Data_Fim futura;
     * - ou não tem Data_Fim e Data_Inicio ainda é futura.
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

    // ========================================================================
    // 4. HELPERS DE DADOS CREATE / UPDATE
    // ========================================================================

    /**
     * Monta os dados necessários para criar um evento.
     *
     * Centralizar isto evita ter o método criarEvento cheio de campos soltos.
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
     * Monta os dados de update de forma controlada.
     *
     * Só atualizamos campos que vieram explicitamente no DTO.
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

        const dataFim = dto.dataFim !== undefined
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

        /*
         * Só mudamos o slug se ele vier explicitamente.
         * Isto evita partir links públicos antigos ao alterar apenas o título.
         */
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

    // ========================================================================
    // 5. HELPERS DE VALIDAÇÃO / NORMALIZAÇÃO
    // ========================================================================

    /**
     * Procura um evento por ID e lança erro se não existir.
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
     * Converte uma string em Date e valida se é uma data real.
     */
    private converterData(valor: string, mensagemErro: string): Date {
        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            throw new BadRequestException(mensagemErro);
        }

        return data;
    }

    /**
     * Valida se a data de fim não é anterior à data de início.
     */
    private validarIntervaloDatas(dataInicio: Date, dataFim: Date | null): void {
        if (dataFim && dataFim < dataInicio) {
            throw new BadRequestException(
                'A data de fim não pode ser anterior à data de início.',
            );
        }
    }

    /**
     * Normaliza texto opcional.
     *
     * - undefined/null ficam null;
     * - strings vazias ficam null;
     * - strings com texto são trimmed.
     */
    private normalizarTexto(valor?: string | null): string | null {
        if (valor === undefined || valor === null) {
            return null;
        }

        const texto = valor.trim();

        return texto.length > 0 ? texto : null;
    }

    // ========================================================================
    // 6. HELPERS DE SLUG
    // ========================================================================

    /**
     * Gera um slug único para o evento.
     *
     * Se o slug já existir:
     * - workshop
     * - workshop-2
     * - workshop-3
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
     * Verifica se já existe algum evento com determinado slug.
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
     * Cria um slug seguro a partir de uma string.
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

    // ========================================================================
    // 7. HELPERS DE IMAGEM / BLOB
    // ========================================================================

    /**
     * Valida se o ficheiro enviado é uma imagem aceite para eventos.
     */
    private validarImagemEvento(file: Express.Multer.File): void {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ];

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
     * Guarda a imagem do evento no Azure Blob Storage.
     *
     * Contentor usado:
     * - eventos
     */
    private async guardarImagemEvento(
        file: Express.Multer.File,
        slug: string,
    ): Promise<string> {
        this.validarImagemEvento(file);

        const nomeFicheiro = `evento-${slug}-${Date.now()}`;

        return this.blobsService.uploadFicheiro(
            'eventos',
            file,
            nomeFicheiro,
        );
    }

    /**
     * Extrai o nome do ficheiro dentro do contentor "eventos" a partir do URL público.
     *
     * Exemplo:
     * https://armazenarcsv.blob.core.windows.net/eventos/evento-workshop-123.jpg
     *
     * Resultado:
     * evento-workshop-123.jpg
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
            /*
             * Se não for um URL válido, não apagamos nada.
             * Isto protege contra URLs externos ou valores inválidos.
             */
            return null;
        }
    }

    /**
     * Apaga uma imagem antiga de evento no Azure Blob.
     *
     * Importante:
     * - só apaga imagens do contentor "eventos";
     * - se o URL não for nosso, ignora;
     * - se o ficheiro já não existir, o BlobsService trata disso com segurança.
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

    // ========================================================================
    // 8. MAPPERS
    // ========================================================================

    /**
     * Mapeia o model da BD para o formato que o frontend consome.
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
     * Mapeia uma versão reduzida do evento para o toast do login.
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
} 