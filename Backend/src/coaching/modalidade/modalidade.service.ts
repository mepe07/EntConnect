import { ConflictException, Injectable } from '@nestjs/common';
import { CreateModalidadeDto } from '../dto/create-modalidade.dto';
import { UpdateModalidadeDto } from '../dto/update-modalidade.dto';
import { PrismaService } from '../../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Modalidade.
 */

@Injectable()
export class ModalidadeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os registos disponiveis.
   * @returns Resultado da operacao.
   */

  async findAll() {
    return this.prisma.modalidade.findMany();
  }

  /**
   * Cria um novo registo.
   * @param createModalidadeDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async create(createModalidadeDto: CreateModalidadeDto) {
    return this.prisma.modalidade.create({
      data: {
        Descricao: createModalidadeDto.Descricao,
      },
    });
  }

  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateModalidadeDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async update(id: number, updateModalidadeDto: UpdateModalidadeDto) {
    return this.prisma.modalidade.update({
      where: { ID_Modalidade: id },
      data: updateModalidadeDto,
    });
  }

  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async remove(id: number) {
    try {
      return await this.prisma.modalidade.delete({
        where: { ID_Modalidade: id },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Impossível remover a modalidade pois a mesma está atribuída a um estúdio.',
        );
      }

      throw error;
    }
  }
}
