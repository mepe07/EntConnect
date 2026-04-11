import { ConflictException, Injectable } from '@nestjs/common';
import { CreateModalidadeDto } from '../dto/create-modalidade.dto';
import { UpdateModalidadeDto } from '../dto/update-modalidade.dto';
import { PrismaService } from '../../prisma/prisma.service'; // Ajusta o caminho conforme o teu projeto

@Injectable()
export class ModalidadeService {

  constructor(private readonly prisma: PrismaService) {} // Injeta o PrismaService

  // MÉTODO PARA LISTAR TODAS (GET)
  async findAll() {
    return this.prisma.modalidade.findMany(); // O findMany() vai buscar todas as linhas da tabela
  }

async create(createModalidadeDto: CreateModalidadeDto) {
    // Usa o Prisma para criar uma nova modalidade na DB
    return this.prisma.modalidade.create({
      data: {
        Descricao: createModalidadeDto.Descricao, // Passamos apenas a propriedade exata
      },
    });
  }
  // MÉTODO PARA EDITAR
  async update(id: number, updateModalidadeDto: UpdateModalidadeDto) {
    return this.prisma.modalidade.update({
      where: { ID_Modalidade: id }, // Procura pelo ID
      data: updateModalidadeDto,    // Atualiza com os dados enviados
    });
  }

  // MÉTODO PARA REMOVER
 // MÉTODO PARA REMOVER (DELETE) COM PROTEÇÃO
  async remove(id: number) {
    try {
      // Tenta apagar a modalidade
      return await this.prisma.modalidade.delete({
        where: { ID_Modalidade: id },
      });
    } catch (error: any) {
      // P2003 é o código do Prisma para "Foreign Key Constraint Failed"
      if (error.code === 'P2003') {
        throw new ConflictException('Impossível remover a modalidade pois a mesma está atribuída a um estúdio.');
      }
      // Se for outro erro estranho, deixa passar
      throw error; 
    }
  }

}
