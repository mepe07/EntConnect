import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfessorDto } from '../dto/create-professor.dto';
import { UpdateProfessorDto } from '../dto/update-professor.dto';
import { PrismaService } from '../../prisma/prisma.service';
/**
 * Servico responsavel pela logica de Professor.
 */

@Injectable()
export class ProfessorService {
  constructor(private readonly prisma: PrismaService) {}

  private buildModalidadesData(modalidadesIds?: number[]) {
    const ids = Array.from(new Set((modalidadesIds ?? []).map(Number))).filter(
      (id) => Number.isInteger(id) && id > 0,
    );

    return ids.map((idModalidade) => ({
      ID_Modalidade: idModalidade,
    }));
  }

  /**
   * Cria um novo registo.
   * @param createProfessorDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async create(createProfessorDto: CreateProfessorDto) {
    try {
      return await this.prisma.professor.create({
        data: {
          Pessoa: {
            create: {
              Nome: createProfessorDto.Nome,
              Email: createProfessorDto.Email,
              Data_Nascimento: new Date(createProfessorDto.Data_Nascimento),
              NIF: createProfessorDto.NIF,
              Contacto: createProfessorDto.Contacto ?? '',
              Foto: createProfessorDto.Foto,
            },
          },
          Professor_Modalidade: {
            create: this.buildModalidadesData(createProfessorDto.modalidadesIds),
          },
        },
        include: {
          Pessoa: true,
          Professor_Modalidade: { include: { Modalidade: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Já existe uma pessoa registada com este NIF ou Email.',
        );
      }
      throw error;
    }
  }

  /**
   * Lista todos os registos disponiveis.
   * @param page Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async findAll(page: number = 1) {
    const limit = 20;
    const skip = (page - 1) * limit;

    const [professores, totalProfessores] = await Promise.all([
      this.prisma.professor.findMany({
        take: limit,
        skip: skip,
        include: {
          Pessoa: true,
          Professor_Modalidade: { include: { Modalidade: true } },
        },
        orderBy: {
          ID_Pessoa: 'asc',
        },
      }),
      this.prisma.professor.count(),
    ]);

    return {
      data: professores,
      meta: {
        total: totalProfessores,
        page: page,
        lastPage: Math.ceil(totalProfessores / limit),
      },
    };
  }

  /**
   * Atualiza um registo existente.
   * @param id Dados recebidos para a operacao.
   * @param updateProfessorDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async update(id: number, updateProfessorDto: UpdateProfessorDto) {
    try {
      let dataNascimento: Date | undefined;
      if (updateProfessorDto.Data_Nascimento) {
        dataNascimento = new Date(updateProfessorDto.Data_Nascimento);
      }

      return await this.prisma.professor.update({
        where: { ID_Pessoa: id },
        data: {
          Pessoa: {
            update: {
              Nome: updateProfessorDto.Nome,
              Email: updateProfessorDto.Email,
              Data_Nascimento: dataNascimento,
              NIF: updateProfessorDto.NIF,
              Contacto: updateProfessorDto.Contacto,
              Foto: updateProfessorDto.Foto,
            },
          },
          ...(updateProfessorDto.modalidadesIds
            ? {
                Professor_Modalidade: {
                  deleteMany: {},
                  create: this.buildModalidadesData(
                    updateProfessorDto.modalidadesIds,
                  ),
                },
              }
            : {}),
        },
        include: {
          Pessoa: true,
          Professor_Modalidade: { include: { Modalidade: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'O NIF ou Email inserido já está a ser utilizado.',
        );
      }
      throw error;
    }
  }

  /**
   * Remove um registo existente.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async remove(id: number) {
    try {
      const professorApagado = await this.prisma.professor.delete({
        where: { ID_Pessoa: id },
      });

      await this.prisma.pessoa.delete({
        where: { ID_Pessoa: id },
      });

      return professorApagado;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Professor com o ID ${id} não foi encontrado ou já foi apagado.`,
        );
      }

      if (error.code === 'P2003') {
        throw new ConflictException(
          'Impossível remover: Este professor tem aulas, coachings associados ou outros papéis no sistema.',
        );
      }

      throw error;
    }
  }
}
