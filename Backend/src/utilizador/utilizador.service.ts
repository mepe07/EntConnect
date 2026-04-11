import { Injectable } from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common'; //exceção

// Serviço para lidar com operações simples CRUD relacionados com utilizadores.

@Injectable()
export class UtilizadorService {

  constructor(private prisma: PrismaService) {}

  // WIP
  async getAllUsers() {
    const utilizadoresRaw = await this.prisma.utilizador.findMany({
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Direcao: true,
            Enc_Educacao: true
          }
        }
      }
    });

return utilizadoresRaw.map((user) => {
      
      let cargoAtribuido = 'Sem Cargo'; 

      if (user.Pessoa?.Professor) {
        cargoAtribuido = 'Professor';
      } else if (user.Pessoa?.Coordenador) {
        cargoAtribuido = 'Coordenador';
      } else if (user.Pessoa?.Direcao) {
        cargoAtribuido = 'Direção';
      } else if (user.Pessoa?.Enc_Educacao) {
        cargoAtribuido = 'Encarregado de Educação';
      }

      return {
        idUtilizador: user.ID_Utilizador,
        username: user.Utilizador,
        ativo: user.Ativo,
        nome: user.Pessoa?.Nome,
        email: user.Pessoa?.Email,
        contacto: user.Pessoa?.Contacto,
        nif: user.Pessoa?.NIF,
        cargo: cargoAtribuido,
      };
    });
  }

  async blockUser(id: number) {
    // Vai à tabela utilizador, procura pelo ID e atualiza o campo ativo para false
    return this.prisma.utilizador.update({
      where: {ID_Utilizador: id},
      data: {Ativo: false}
    })
  }

  async unlockUser(id: number) {
    // Vai à tabela utilizador, procura pelo ID e atualiza o campo ativo para true
    return this.prisma.utilizador.update({
      where: {ID_Utilizador: id},
      data: {Ativo: true}
    })
  }

    async UploadPhoto(url: string, id: number) {
    return this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: {
        Pessoa: { 
          update: {
            Foto: url,
          },
        },
      },
      //Para te devolver os dados da pessoa e confirmares a foto no Postman
      include: {
        Pessoa: true, 
      }
    });
  }

  async RemovePhoto(id: number) {
    // 1. Encontra o Utilizador para descobrir o seu ID_Pessoa
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      select: { ID_Pessoa: true },
    });

    if (!utilizador) {
      // Lembra-te de importar o NotFoundException no topo se ainda não o tiveres!
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`); 
    }
    
    // 2. Vai à tabela Pessoa e coloca a foto a null (vazio)
    return this.prisma.pessoa.update({
      where: { ID_Pessoa: utilizador.ID_Pessoa },
      data: { Foto: null },
    });
  }

  async getFotoPerfil(id: number) {
    // Procura o utilizador pelo ID e inclui os dados da Pessoa associada
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: { Pessoa: true } 
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    // Retorna apenas o URL (verifica se o nome da coluna no teu Prisma é mesmo "Foto" ou "UrlPhoto")
    return {
      id: id,
      url: utilizador.Pessoa.Foto || null, // Devolve null se a pessoa ainda não tiver foto
      mensagem: utilizador.Pessoa.Foto ? 'Foto encontrada.' : 'Este utilizador não tem foto de perfil.'
    };
  }
  
  
  async getMinhasAulas(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Enc_Educacao: {
              include: { Aluno: true }
            }
          }
        }
      }
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException(`Utilizador não encontrado.`);
    }

    const idPessoa = utilizador.ID_Pessoa;

    // =======================================================
    // CENÁRIO A: O UTILIZADOR É O PROFESSOR / COREÓGRAFO
    // =======================================================
    if (utilizador.Pessoa.Professor) {
      const aulasProfessor = await this.prisma.aula.findMany({
        where: { ID_Professor: idPessoa },
        include: {
          Coaching: { include: { Sala: true } },
          Aula_Aluno: { include: { Aluno: true } }
        },
        orderBy: { Data_Aula: 'asc' }
      });

      return aulasProfessor.map(aula => {
        const dataStr = aula.Data_Aula.toLocaleDateString('pt-PT');
        const horaInicio = aula.Data_Aula.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        const duracaoMinutos = aula.Coaching?.Duracao || 60;
        const horaFimObj = new Date(aula.Data_Aula.getTime() + duracaoMinutos * 60000);
        const horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        const nomesClientes = aula.Aula_Aluno.map(aa => aa.Aluno.Nome).join(', ');

        return {
          // Ajustado para o mundo da dança
          sessao: aula.Resumo_Aula || 'Aula Privada / Ensaio',
          cliente: nomesClientes || 'Sem aluno associado',
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: aula.Coaching?.Sala?.Nome || 'Estúdio a definir' 
        };
      });
    } 
    
    // =======================================================
    // CENÁRIO B: O UTILIZADOR É O ALUNO (OU ENC. EDUCAÇÃO)
    // =======================================================
    else if (utilizador.Pessoa.Enc_Educacao) {
      const aulasCliente = await this.prisma.aula.findMany({
        where: {
          Aula_Aluno: {
            some: {
              Aluno: { ID_Enc_Educacao: idPessoa }
            }
          }
        },
        include: {
          Professor: { include: { Pessoa: true } },
          Coaching: { include: { Sala: true } },
          Aula_Aluno: { include: { Aluno: true } }
        },
        orderBy: { Data_Aula: 'asc' }
      });

      return aulasCliente.map(aula => {
        const dataStr = aula.Data_Aula.toLocaleDateString('pt-PT');
        const horaInicio = aula.Data_Aula.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        const duracaoMinutos = aula.Coaching?.Duracao || 60;
        const horaFimObj = new Date(aula.Data_Aula.getTime() + duracaoMinutos * 60000);
        const horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        const meusAlunosNestaAula = aula.Aula_Aluno
          .filter(aa => aa.Aluno.ID_Enc_Educacao === idPessoa)
          .map(aa => aa.Aluno.Nome)
          .join(', ');

        return {
          // Ajustado para o mundo da dança
          sessao: aula.Resumo_Aula ? aula.Resumo_Aula : `Aula de Dança - ${meusAlunosNestaAula}`,
          coach: aula.Professor?.Pessoa?.Nome || 'Professor a definir',
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: aula.Coaching?.Sala?.Nome || 'Estúdio a definir'
        };
      });
    }

    return [];
  }

  // create(createUtilizadorDto: CreateUtilizadorDto) {
  //   return 'This action adds a new utilizador';
  // }

  // findAll() {
  //   return `This action returns all utilizador`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} utilizador`;
  // }

  // update(id: number, updateUtilizadorDto: UpdateUtilizadorDto) {
  //   return `This action updates a #${id} utilizador`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} utilizador`;
  // }
  
  async getAlunosByEE(idEncEducacao: number) {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: idEncEducacao }
    });
  }

}
