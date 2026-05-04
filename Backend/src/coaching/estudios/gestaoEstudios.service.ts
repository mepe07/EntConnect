import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCoachingDto } from '../dto/create-coaching.dto';
import { UpdateCoachingDto } from '../dto/update-coaching.dto';
import { PrismaService } from '../../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Gestao Estudios.
 */

@Injectable()
export class GestaoEstudiosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a operacao get all studios.
   * @returns Resultado da operacao.
   */

  async getAllStudios() {
    return this.prisma.sala.findMany();
  }

  /**
   * Executa a operacao lock studio.
   * @param studioId Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async lockStudio(studioId: number) {
    const studio = await this.prisma.sala.findUnique({
      where: { ID_Sala: studioId },
    });

    if (!studio) {
      throw new NotFoundException(`Estúdio com ID ${studioId} não encontrado.`);
    }

    if (studio.Disponivel === false) {
      throw new BadRequestException(
        `Estúdio com ID ${studioId} já está bloqueado.`,
      );
    }

    const updatedStudio = await this.prisma.sala.update({
      where: { ID_Sala: studioId },
      data: { Disponivel: false },
    });

    return {
      message: `Estúdio '${studio.Nome}' bloqueado com sucesso.`,

      studio: updatedStudio,
    };
  }

  /**
   * Executa a operacao unlock studio.
   * @param studioId Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async unlockStudio(studioId: number) {
    const studio = await this.prisma.sala.findUnique({
      where: { ID_Sala: studioId },
    });

    if (!studio) {
      throw new NotFoundException(`Estúdio com ID ${studioId} não encontrado.`);
    }

    if (studio.Disponivel === true) {
      throw new BadRequestException(
        `Estúdio com ID ${studioId} já está desbloqueado.`,
      );
    }

    const updatedStudio = await this.prisma.sala.update({
      where: { ID_Sala: studioId },
      data: { Disponivel: true },
    });

    return {
      message: `Estúdio '${studio.Nome}' desbloqueado com sucesso.`,
      studio: updatedStudio,
    };
  }
}
