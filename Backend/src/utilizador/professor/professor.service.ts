import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProfessorDto } from '../dto/create-professor.dto';
import { UpdateProfessorDto } from '../dto/update-professor.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
/**
 * Serviço responsável pela gestão de professores.
 */
export class ProfessorService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Cria um professor e a respetiva pessoa associada.
   *
   * @param createProfessorDto - Dados do professor a criar.
   * @returns Professor criado com a pessoa associada.
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
              Contacto: createProfessorDto.Contacto ?? "",
              Foto: createProfessorDto.Foto,
            },
          },
        },
        include: {
          Pessoa: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Já existe uma pessoa registada com este NIF ou Email.');
      }
      throw error;
    }
  }

  /**
   * Lista professores com paginação.
   *
   * @param page - Página a consultar.
   * @returns Lista paginada de professores.
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

  // MÉTODO PARA EDITAR (PATCH)
  async update(id: number, updateProfessorDto: UpdateProfessorDto) {
    try {
      // Se a data de nascimento vier no pedido, temos de a converter para o formato Date do JS
      let dataNascimento: Date | undefined;
      if (updateProfessorDto.Data_Nascimento) {
        dataNascimento = new Date(updateProfessorDto.Data_Nascimento);
      }

      return await this.prisma.professor.update({
        where: { ID_Pessoa: id }, // Procura pelo ID
        data: {
          Pessoa: {
            update: {
              // Passamos os dados novos para atualizar a tabela Pessoa
              Nome: updateProfessorDto.Nome,
              Email: updateProfessorDto.Email,
              Data_Nascimento: dataNascimento,
              NIF: updateProfessorDto.NIF,
              Contacto: updateProfessorDto.Contacto,
              Foto: updateProfessorDto.Foto,
            },
          },
        },
        include: {
          Pessoa: true, // Devolve os dados atualizados completos na resposta
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('O NIF ou Email inserido já está a ser utilizado.');
      }
      throw error;
    }
  }
  // MÉTODO PARA REMOVER (DELETE)

  async remove(id: number) {
    try {
      // 1º Passo: Apagar o registo da tabela Professor
      const professorApagado = await this.prisma.professor.delete({
        where: { ID_Pessoa: id },
      });

      // 2º Passo: Apagar os dados da tabela Pessoa (Opcional)
      // Nota: Se esta pessoa for também "Encarregado de Educação" ou "Utilizador", 
      // apagar a Pessoa vai dar erro (o que é bom, por segurança!).
      // Podes comentar ou remover a linha abaixo se quiseres manter os dados pessoais na BD.
      await this.prisma.pessoa.delete({
        where: { ID_Pessoa: id },
      });

      return professorApagado;

    } catch (error: any) {
      // ERRO P2025: O ID já não existe na base de dados
      if (error.code === 'P2025') {
        throw new NotFoundException(`Professor com o ID ${id} não foi encontrado ou já foi apagado.`);
      }

      // ERRO P2003: Chave Estrangeira (Foreign Key Constraint)
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Impossível remover: Este professor tem aulas, coachings associados ou outros papéis no sistema.'
        );
      }

      // Se for outro erro qualquer, deixa passar
      throw error;
    }
  }
}
