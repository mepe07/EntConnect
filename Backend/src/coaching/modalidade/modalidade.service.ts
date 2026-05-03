import { ConflictException, Injectable } from '@nestjs/common';
import { CreateModalidadeDto } from '../dto/create-modalidade.dto';
import { UpdateModalidadeDto } from '../dto/update-modalidade.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
/**
 * Serviço responsável pela gestão de modalidades de coaching.
 */
export class ModalidadeService {

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as modalidades disponíveis.
   *
   * @returns Modalidades registadas na base de dados.
   */
  async findAll() {
    return this.prisma.modalidade.findMany();
  }

  /**
   * Cria uma nova modalidade.
   *
   * @param createModalidadeDto - Dados da modalidade a criar.
   * @returns Modalidade criada.
   */
  async create(createModalidadeDto: CreateModalidadeDto) {
    return this.prisma.modalidade.create({
      data: {
        Descricao: createModalidadeDto.Descricao,
      },
    });
  }

  /**
   * Atualiza uma modalidade existente.
   *
   * @param id - Identificador da modalidade.
   * @param updateModalidadeDto - Dados a atualizar.
   * @returns Modalidade atualizada.
   */
  async update(id: number, updateModalidadeDto: UpdateModalidadeDto) {
    return this.prisma.modalidade.update({
      where: { ID_Modalidade: id },
      data: updateModalidadeDto,
    });
  }

  /**
   * Remove uma modalidade, desde que não esteja em uso.
   *
   * @param id - Identificador da modalidade.
   * @returns Modalidade removida.
   */
  async remove(id: number) {
    try {
      return await this.prisma.modalidade.delete({
        where: { ID_Modalidade: id },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException('Impossível remover a modalidade pois a mesma está atribuída a um estúdio.');
      }
      throw error;
    }
  }

}
