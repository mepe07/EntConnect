// Ficheiro: Backend/src/eventos/eventos.service.ts

import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { garantirPermissaoGestaoEventos } from './eventos.permissoes';
import { CriarEventoDto } from './dto/criar-evento.dto';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto';
import { ListarEventosPublicosDto } from './dto/listar-eventos-publicos.dto';
import { ListarEventosGestaoDto } from './dto/listar-eventos-gestao.dto';
import { TipoEvento } from './enums/tipo-evento.enum';
import { BlobsService } from '../Infraestrutura/Blobs/blobs.service';
import 'multer';

@Injectable()
export class EventosService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly blobsService: BlobsService,
    ) { }

    // ========================================================================
    // 1. ENDPOINTS PÚBLICOS
    // ========================================================================

    async listarEventosPublicos(filtros: ListarEventosPublicosDto) {
        const prisma = this.prisma as any;
        const where: any = {
            Publico: true,
            Publicado: true,
            Ativo: true,
        };

        const and: any[] = [];

        if (filtros.tipo) {
            where.Tipo = filtros.tipo;
        }

        if (filtros.destaque !== undefined) {
            where.Destaque = filtros.destaque;
        }

        // Por defeito, a página pública mostra eventos atuais/futuros.
        // Se o frontend enviar apenasFuturos=false, também pode mostrar histórico.
        const apenasFuturos = filtros.apenasFuturos ?? true;

        if (apenasFuturos) {
            const agora = new Date();

            and.push({
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
            });
        }

        if (filtros.pesquisa?.trim()) {
            const pesquisa = filtros.pesquisa.trim();

            and.push({
                OR: [
                    { Titulo: { contains: pesquisa } },
                    { Resumo: { contains: pesquisa } },
                    { Descricao: { contains: pesquisa } },
                    { Local: { contains: pesquisa } },
                ],
            });
        }

        if (and.length > 0) {
            where.AND = and;
        }

        const eventos = await prisma.evento.findMany({
            where,
            take: filtros.limite ?? 20,
            orderBy: [
                { Data_Inicio: 'asc' },
                { ID_Evento: 'desc' },
            ],
        });

        return eventos.map((evento: any) => this.mapearEvento(evento));
    }

    async listarEventosLoginToast() {
        const prisma = this.prisma as any;
        const agora = new Date();

        const eventos = await prisma.evento.findMany({
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

        return eventos.map((evento: any) => this.mapearEventoResumo(evento));
    }

    async obterEventoPublicoPorSlug(slug: string) {
        const prisma = this.prisma as any;

        const evento = await prisma.evento.findUnique({
            where: {
                Slug: slug,
            },
        });

        if (!evento || !evento.Publico || !evento.Publicado || !evento.Ativo) {
            throw new NotFoundException('Evento não encontrado.');
        }

        return this.mapearEvento(evento);
    }

    // ========================================================================
    // 2. GESTÃO INTERNA
    // ========================================================================

    async listarEventosGestao(
        filtros: ListarEventosGestaoDto,
        utilizador: UtilizadorAutenticado,
    ) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const prisma = this.prisma as any;
        const where: any = {};
        const and: any[] = [];

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

        if (filtros.pesquisa?.trim()) {
            const pesquisa = filtros.pesquisa.trim();

            and.push({
                OR: [
                    { Titulo: { contains: pesquisa } },
                    { Resumo: { contains: pesquisa } },
                    { Descricao: { contains: pesquisa } },
                    { Local: { contains: pesquisa } },
                ],
            });
        }

        if (and.length > 0) {
            where.AND = and;
        }

        const eventos = await prisma.evento.findMany({
            where,
            take: filtros.limite ?? 50,
            orderBy: [
                { Data_Atualizacao: 'desc' },
                { ID_Evento: 'desc' },
            ],
        });

        return eventos.map((evento: any) => this.mapearEvento(evento));
    }

    async obterEventoGestao(idEvento: number, utilizador: UtilizadorAutenticado) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const evento = await this.obterEventoOuFalhar(idEvento);
        return this.mapearEvento(evento);
    }

    async criarEvento(
        dto: CriarEventoDto,
        utilizador: UtilizadorAutenticado,
        imagem?: Express.Multer.File,
    ) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const prisma = this.prisma as any;

        const dataInicio = this.converterData(
            dto.dataInicio,
            'A data de início é inválida.',
        );

        const dataFim = dto.dataFim
            ? this.converterData(dto.dataFim, 'A data de fim é inválida.')
            : null;

        this.validarIntervaloDatas(dataInicio, dataFim);

        // Geramos o slug apenas uma vez.
        const slug = await this.gerarSlugUnico(dto.slug || dto.titulo);

        // Se vier uma imagem no FormData, fazemos upload para o Azure Blob.
        // Se não vier imagem, mantemos a possibilidade de receber um URL manual no dto.imagem.
        const urlImagem = imagem
            ? await this.guardarImagemEvento(imagem, slug)
            : this.normalizarTexto(dto.imagem);

        const evento = await prisma.evento.create({
            data: {
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
            },
        });

        return this.mapearEvento(evento);
    }

    async atualizarEvento(
        idEvento: number,
        dto: AtualizarEventoDto,
        utilizador: UtilizadorAutenticado,
        imagem?: Express.Multer.File,
    ) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const prisma = this.prisma as any;
        const eventoAtual = await this.obterEventoOuFalhar(idEvento);

        const dataInicio = dto.dataInicio
            ? this.converterData(dto.dataInicio, 'A data de início é inválida.')
            : eventoAtual.Data_Inicio;

        const dataFim = dto.dataFim !== undefined
            ? dto.dataFim
                ? this.converterData(dto.dataFim, 'A data de fim é inválida.')
                : null
            : eventoAtual.Data_Fim;

        this.validarIntervaloDatas(dataInicio, dataFim);

        const data: any = {
            Data_Inicio: dataInicio,
            Data_Fim: dataFim,
            Data_Atualizacao: new Date(),
            ID_Utilizador_Atualizacao: utilizador.sub,
        };

        if (dto.titulo !== undefined) {
            data.Titulo = dto.titulo.trim();
        }

    // Guardamos o slug final para usar também no nome da imagem.
    let slugFinal = eventoAtual.Slug;

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

    // Se vier uma nova imagem, ela tem prioridade sobre o campo dto.imagem.
    if (imagem) {
        data.Imagem = await this.guardarImagemEvento(imagem, slugFinal);
    } else if (dto.imagem !== undefined) {
        data.Imagem = this.normalizarTexto(dto.imagem);
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

        const evento = await prisma.evento.update({
            where: {
                ID_Evento: idEvento,
            },
            data,
        });

        return this.mapearEvento(evento);
    }

    async removerEvento(idEvento: number, utilizador: UtilizadorAutenticado) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const prisma = this.prisma as any;

        await this.obterEventoOuFalhar(idEvento);

        const evento = await prisma.evento.update({
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

    async reativarEvento(idEvento: number, utilizador: UtilizadorAutenticado) {
        garantirPermissaoGestaoEventos(utilizador.role);

        const prisma = this.prisma as any;

        await this.obterEventoOuFalhar(idEvento);

        const evento = await prisma.evento.update({
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
    // 3. HELPERS INTERNOS
    // ========================================================================

    private async obterEventoOuFalhar(idEvento: number) {
        if (!Number.isInteger(idEvento) || idEvento <= 0) {
            throw new BadRequestException('ID do evento inválido.');
        }

        const prisma = this.prisma as any;

        const evento = await prisma.evento.findUnique({
            where: {
                ID_Evento: idEvento,
            },
        });

        if (!evento) {
            throw new NotFoundException('Evento não encontrado.');
        }

        return evento;
    }

    private converterData(valor: string, mensagemErro: string): Date {
        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            throw new BadRequestException(mensagemErro);
        }

        return data;
    }

    private validarIntervaloDatas(dataInicio: Date, dataFim: Date | null): void {
        if (dataFim && dataFim < dataInicio) {
            throw new BadRequestException('A data de fim não pode ser anterior à data de início.');
        }
    }

    private normalizarTexto(valor?: string | null): string | null {
        if (valor === undefined || valor === null) {
            return null;
        }

        const texto = valor.trim();

        return texto.length > 0 ? texto : null;
    }

    private async gerarSlugUnico(valorBase: string, idEventoIgnorar?: number): Promise<string> {
        const prisma = this.prisma as any;
        const base = this.criarSlug(valorBase);

        let slug = base;
        let contador = 2;

        while (await this.existeSlug(slug, idEventoIgnorar)) {
            slug = `${base}-${contador}`;
            contador++;
        }

        return slug;
    }

    private async existeSlug(slug: string, idEventoIgnorar?: number): Promise<boolean> {
        const prisma = this.prisma as any;

        const where: any = {
            Slug: slug,
        };

        if (idEventoIgnorar) {
            where.ID_Evento = {
                not: idEventoIgnorar,
            };
        }

        const evento = await prisma.evento.findFirst({
            where,
            select: {
                ID_Evento: true,
            },
        });

        return Boolean(evento);
    }

    private criarSlug(valor: string): string {
        const slug = valor
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!slug) {
            throw new BadRequestException('Não foi possível gerar um slug válido para o evento.');
        }

        return slug.slice(0, 160);
    }

    private mapearEvento(evento: any) {
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
 * Valida se o ficheiro enviado é uma imagem segura para eventos.
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
            throw new BadRequestException('A imagem do evento tem de ser JPG, PNG ou WEBP.');
        }

        if (file.size > tamanhoMaximoBytes) {
            throw new BadRequestException(`A imagem do evento não pode ultrapassar ${tamanhoMaximoMb}MB.`);
        }
    }

    /**
     * Guarda a imagem do evento no Azure Blob Storage.
     *
     * Contentor usado:
     * - eventos
     *
     * O URL devolvido é guardado na coluna Imagem da tabela Evento.
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

    private mapearEventoResumo(evento: any) {
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