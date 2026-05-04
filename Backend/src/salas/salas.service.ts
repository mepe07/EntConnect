import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaDto } from './dto/create-sala.dto';
/**
 * Servico responsavel pela logica de Salas.
 */

@Injectable()
export class SalasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cria um novo registo.
   * @param createSalaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async create(createSalaDto: CreateSalaDto) {
    const novaSala = await this.prisma.sala.create({
      data: {
        Nome: createSalaDto.nome,
        Disponivel: createSalaDto.disponivel === true,
        ID_Modalidade: parseInt(createSalaDto.modalidade as string) || null,
      },
      include: {
        Modalidade: true,
      },
    });

    return {
      ID_Sala: novaSala.ID_Sala,
      Nome: novaSala.Nome,
      Disponivel: novaSala.Disponivel,
      Modalidade: novaSala.Modalidade
        ? novaSala.Modalidade.Descricao
        : 'Sem Modalidade',
    };
  }

  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  async findAll() {
    const salasDaBD = await this.prisma.sala.findMany({
      orderBy: { ID_Sala: 'asc' },
      include: {
        Modalidade: true,
      },
    });

    return salasDaBD.map((sala) => ({
      ID_Sala: sala.ID_Sala,
      Nome: sala.Nome,
      Disponivel: sala.Disponivel,
      Modalidade: sala.Modalidade
        ? sala.Modalidade.Descricao
        : 'Sem Modalidade',
    }));
  }

  /**
   * Obtem um registo pelo identificador.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  findOne(id: number) {
    return `This action returns a #${id} sala`;
  }

  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateSalaDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async update(id: number, updateSalaDto: any) {
    const salaAtualizada = await this.prisma.sala.update({
      where: { ID_Sala: id },
      data: {
        Nome: updateSalaDto.nome,
        Disponivel:
          updateSalaDto.disponivel === true ||
          updateSalaDto.disponivel === 'true',
        ID_Modalidade: parseInt(updateSalaDto.modalidade) || null,
      },
      include: {
        Modalidade: true,
      },
    });

    return {
      ID_Sala: salaAtualizada.ID_Sala,
      Nome: salaAtualizada.Nome,
      Disponivel: salaAtualizada.Disponivel,
      Modalidade: salaAtualizada.Modalidade
        ? salaAtualizada.Modalidade.Descricao
        : 'Sem Modalidade',
    };
  }

  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async remove(id: number) {
    try {
      return await this.prisma.sala.delete({
        where: { ID_Sala: id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new HttpException(
          'Não é possível apagar esta sala porque tem sessões de Coaching associadas.',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }
}
