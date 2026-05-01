import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePessoalDto } from './dto/update-pessoal.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UpsertEducandoDto } from './dto/upsert-educando.dto';

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
        idPessoa: user.ID_Pessoa,
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

  async createUser(createUtilizadorDto: CreateUtilizadorDto) {
    const { nome, username, email, contacto, nif, dataNascimento, cargo, password } = createUtilizadorDto;

    // 1. Verificar se username ou email já existem
    const existente = await this.prisma.utilizador.findFirst({
      where: {
        OR: [
          { Utilizador: username },
          { Pessoa: { Email: email } },
        ],
      },
    });

    if (existente) {
      throw new ConflictException('Já existe um utilizador com esse username ou email.');
    }

    // 2. Hash da password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Construir os dados do cargo dinamicamente
    const dadosCargo =
      cargo === 'Professor'                  ? { Professor: { create: {} } } :
      cargo === 'Coordenador'                ? { Coordenador: { create: {} } } :
      cargo === 'Direção'                    ? { Direcao: { create: {} } } :
      cargo === 'Encarregado de Educação'    ? { Enc_Educacao: { create: {} } } :
      {};

    // 4. Criar Pessoa + Utilizador
    const novoUtilizador = await this.prisma.utilizador.create({
      data: {
        Utilizador: username,
        Password: hashedPassword,
        Ativo: true,
        Pessoa: {
          create: {
            Nome: nome,
            Email: email,
            Contacto: contacto ?? '',
            NIF: nif ?? '',
            Data_Nascimento: new Date(dataNascimento),
            ...dadosCargo,
          },
        },
      },
      include: { Pessoa: true },
    });

    return {
      id: novoUtilizador.ID_Utilizador,
      username: novoUtilizador.Utilizador,
      mensagem: `Utilizador "${nome}" criado com sucesso.`,
    };
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

  async updatePassword(id: number, plainPassword: string) {
    // Verifica se o utilizador existe
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });
 
    if (!utilizador) {
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }
 
    // Faz o hash da nova password antes de guardar
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
 
    return this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Password: hashedPassword },
    });
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
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`); 
    }
    
    // 2. Vai à tabela Pessoa e coloca a foto a null (vazio)
    return this.prisma.pessoa.update({
      where: { ID_Pessoa: utilizador.ID_Pessoa },
      data: { Foto: null },
    });
  }

  async getFotoPerfil(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: { Pessoa: true } 
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    return {
      id: id,
      url: utilizador.Pessoa.Foto || null,
      mensagem: utilizador.Pessoa.Foto ? 'Foto encontrada.' : 'Este utilizador não tem foto de perfil.'
    };
  }
  
  /*
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

  //   if (!utilizador || !utilizador.Pessoa) {
  //     throw new NotFoundException(`Utilizador não encontrado.`);
  //   }

  //   const idPessoa = utilizador.ID_Pessoa;

  //   if (utilizador.Pessoa.Professor) {
  //     const aulasProfessor = await this.prisma.aula.findMany({
  //       where: { ID_Professor: utilizador.Pessoa.Professor.ID_Pessoa, }, // Procura as aulas do prof logado
  //       include: {
  //         Coaching: { include: { Sala: true } }, 
  //         Aula_Aluno: { include: { Aluno: true } } 
  //       },
  //       orderBy: { Data_Aula: 'asc' }
  //     });

  //     return aulasProfessor.map(aula => {
  //       const dataStr = aula.Data_Aula.toLocaleDateString('pt-PT');
  //       const horaInicio = aula.Data_Aula.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
  //       const duracaoMinutos = aula.Coaching?.Duracao || 60;
  //       const horaFimObj = new Date(aula.Data_Aula.getTime() + duracaoMinutos * 60000);
  //       const horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  //       const nomesClientes = aula.Aula_Aluno.map(aa => aa.Aluno.Nome).join(', ');

  //       return {
  //         sessao: aula.Resumo_Aula || 'Aula Privada / Ensaio',
  //         cliente: nomesClientes || 'Sem aluno associado',
  //         data: dataStr,
  //         horario: `${horaInicio} - ${horaFim}`,
  //         formato: aula.Coaching?.Sala?.Nome || 'Estúdio a definir' 
  //       };
  //     });
  //   } 
    
  //   else if (utilizador.Pessoa.Enc_Educacao) {
  //     const aulasCliente = await this.prisma.aula.findMany({
  //       where: {
  //         Aula_Aluno: {
  //           some: {
  //             Aluno: { ID_Enc_Educacao: idPessoa }
  //           }
  //         }
  //       },
  //       include: {
  //         Professor: { include: { Pessoa: true } },
  //         Coaching: { include: { Sala: true } },
  //         Aula_Aluno: { include: { Aluno: true } }
  //       },
  //       orderBy: { Data_Aula: 'asc' }
  //     });

  //     return aulasCliente.map(aula => {
  //       const dataStr = aula.Data_Aula.toLocaleDateString('pt-PT');
  //       const horaInicio = aula.Data_Aula.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
  //       const duracaoMinutos = aula.Coaching?.Duracao || 60;
  //       const horaFimObj = new Date(aula.Data_Aula.getTime() + duracaoMinutos * 60000);
  //       const horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  //       const meusAlunosNestaAula = aula.Aula_Aluno
  //         .filter(aa => aa.Aluno.ID_Enc_Educacao === idPessoa)
  //         .map(aa => aa.Aluno.Nome)
  //         .join(', ');

  //       return {
  //         sessao: aula.Resumo_Aula ? aula.Resumo_Aula : `Aula de Dança - ${meusAlunosNestaAula}`,
  //         coach: aula.Professor?.Pessoa?.Nome || 'Professor a definir',
  //         data: dataStr,
  //         horario: `${horaInicio} - ${horaFim}`,
  //         formato: aula.Coaching?.Sala?.Nome || 'Estúdio a definir'
  //       };
  //     });
  //   }

    return [];
  }*/

  async getAlunosByEE(idEncEducacao: number) {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: idEncEducacao },
      orderBy: { Nome: 'asc' },
    });
  }

  async getAlunosSemEncarregado() {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: null },
      orderBy: { Nome: 'asc' },
    });
  }

  async criarEducando(idEncEducacao: number, dto: UpsertEducandoDto) {
    await this.garantirEncarregadoEducacao(idEncEducacao);

    try {
      return await this.prisma.aluno.create({
        data: {
          ID_Enc_Educacao: idEncEducacao,
          Nome: dto.nome,
          Data_Nascimento: new Date(dto.dataNascimento),
          NIF: dto.nif,
          Mail: dto.mail || null,
          Contato: dto.contato || null,
          Menor_Idade: this.calcularMenorIdade(dto.dataNascimento),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Ja existe um aluno com esse NIF.');
      }
      throw error;
    }
  }

  async atualizarEducando(idEncEducacao: number, idAluno: number, dto: UpsertEducandoDto) {
    await this.garantirAlunoDoEncarregado(idEncEducacao, idAluno);

    try {
      return await this.prisma.aluno.update({
        where: { ID_aluno: idAluno },
        data: {
          Nome: dto.nome,
          Data_Nascimento: new Date(dto.dataNascimento),
          NIF: dto.nif,
          Mail: dto.mail || null,
          Contato: dto.contato || null,
          Menor_Idade: this.calcularMenorIdade(dto.dataNascimento),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Ja existe um aluno com esse NIF.');
      }
      throw error;
    }
  }

  async removerEducando(idEncEducacao: number, idAluno: number) {
    await this.garantirAlunoDoEncarregado(idEncEducacao, idAluno);

    await this.prisma.coaching_Aluno.updateMany({
      where: {
        ID_Aluno: idAluno,
        ID_Enc_Educacao: idEncEducacao,
      },
      data: { ID_Enc_Educacao: null },
    });

    await this.prisma.aluno.update({
      where: { ID_aluno: idAluno },
      data: { ID_Enc_Educacao: null },
    });

    return { mensagem: 'Educando removido do encarregado de educacao com sucesso.' };
  }

  async associarEducando(idEncEducacao: number, idAluno: number) {
    await this.garantirEncarregadoEducacao(idEncEducacao);

    const aluno = await this.prisma.aluno.findUnique({
      where: { ID_aluno: idAluno },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno nao encontrado.');
    }

    if (aluno.ID_Enc_Educacao) {
      throw new ConflictException('Este aluno ja esta associado a um encarregado de educacao.');
    }

    return this.prisma.aluno.update({
      where: { ID_aluno: idAluno },
      data: { ID_Enc_Educacao: idEncEducacao },
    });
  }

  private async garantirEncarregadoEducacao(idEncEducacao: number) {
    const encarregado = await this.prisma.enc_Educacao.findUnique({
      where: { ID_Pessoa: idEncEducacao },
    });

    if (!encarregado) {
      throw new NotFoundException('Encarregado de educacao nao encontrado.');
    }

    return encarregado;
  }

  private async garantirAlunoDoEncarregado(idEncEducacao: number, idAluno: number) {
    await this.garantirEncarregadoEducacao(idEncEducacao);

    const aluno = await this.prisma.aluno.findFirst({
      where: {
        ID_aluno: idAluno,
        ID_Enc_Educacao: idEncEducacao,
      },
    });

    if (!aluno) {
      throw new NotFoundException('Educando nao encontrado para este encarregado de educacao.');
    }

    return aluno;
  }

  private calcularMenorIdade(dataNascimento: string) {
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade -= 1;
    }

    return idade < 18;
  }

  // Ficheiro: utilizador.service.ts
  async updateDadosPessoais(idUtilizador: number, updateDto: UpdatePessoalDto) {
    // Procura o utilizador para descobrir qual é o ID da Pessoa associada
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
    });

    if (!utilizador || !utilizador.ID_Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    // Atualiza a tabela Pessoa com o novo NIF e Telemóvel que vêm do DTO
    return this.prisma.pessoa.update({
      where: { ID_Pessoa: utilizador.ID_Pessoa },
      data: {
        Nome: updateDto.nome,
        NIF: updateDto.nif,
        Contacto: updateDto.contacto,
      },
    });
  }


  // ====================================================================
  // OBTER 1 UTILIZADOR (COM OS DADOS PESSOAIS E CARGOS PARA O PERFIL)
  // ====================================================================
  async findOne(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: {
        Pessoa: {
          include: {
            Direcao: true,
            Professor: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador) throw new NotFoundException('Utilizador não encontrado');
    return utilizador;
  }

  async updateCargo(idUtilizador: number, novoCargo: string, confirmarRemocaoAssociacoes = false) {
    const cargosValidos = ['Professor', 'Coordenador', 'Direção', 'Encarregado de Educação'];
    const cargoEncarregadoEducacao = cargosValidos[3];
    if (!cargosValidos.includes(novoCargo)) {
      throw new NotFoundException(`Cargo "${novoCargo}" não é válido.`);
    }

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Direcao: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    const idPessoa = utilizador.ID_Pessoa;
    const pessoa = utilizador.Pessoa;

    if (pessoa.Enc_Educacao && novoCargo !== cargoEncarregadoEducacao) {
      const impacto = await this.obterImpactoRemocaoEncarregadoEducacao(idPessoa);

      if ((impacto.alunosAssociados > 0 || impacto.inscricoesCoachingAssociadas > 0) && !confirmarRemocaoAssociacoes) {
        throw new ConflictException({
          code: 'CONFIRMACAO_REMOCAO_ASSOCIACOES_ENCARREGADO',
          message: 'Este utilizador tem alunos ou inscricoes de coaching associadas enquanto encarregado de educacao.',
          impacto,
        });
      }
    }

    // Apagar o cargo atual (apenas o que existir)
    if (pessoa.Professor)    await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador)  await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Direcao)      await this.prisma.direcao.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao) {
      await this.removerAssociacoesEncarregadoEducacao(idPessoa);
      await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });
    }

    // Criar o novo cargo
    if (novoCargo === 'Professor')                 await this.prisma.professor.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Coordenador')          await this.prisma.coordenador.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Direção')              await this.prisma.direcao.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === cargoEncarregadoEducacao) await this.prisma.enc_Educacao.create({ data: { ID_Pessoa: idPessoa } });

    return { mensagem: `Cargo atualizado para "${novoCargo}" com sucesso.` };
  }

  async mudarPassword(id: number, dto: ChangePasswordDto) {
    // 1. Procurar o utilizador
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });

    if (!utilizador) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    // 2. O Detetor de Mentiras: Verificar se a password atual enviada 
    // bate com a hash que está na base de dados
    const passValida = await bcrypt.compare(dto.passAtual, utilizador.Password);

    if (!passValida) {
      throw new UnauthorizedException('A password atual está incorreta.');
    }

    // 3. Gerar a nova Hash (nunca guardamos texto limpo!)
    const saltRounds = 10;
    const novaHash = await bcrypt.hash(dto.passNova, saltRounds);

    // 4. Atualizar na Base de Dados
    await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Password: novaHash },
    });

    return { message: 'Password alterada com sucesso!' };
  }
  async deleteUser(idUtilizador: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Direcao: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    const idPessoa = utilizador.ID_Pessoa;
    const pessoa = utilizador.Pessoa;

    // Apagar registos de cargo (FK para Pessoa)
    if (pessoa.Professor)    await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador)  await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Direcao)      await this.prisma.direcao.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao) {
      await this.removerAssociacoesEncarregadoEducacao(idPessoa);
      await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });
    }

    // Apagar Utilizador (FK para Pessoa)
    await this.prisma.utilizador.delete({ where: { ID_Utilizador: idUtilizador } });

    // Apagar Pessoa
    await this.prisma.pessoa.delete({ where: { ID_Pessoa: idPessoa } });

    return { mensagem: 'Utilizador eliminado com sucesso.' };
  }

  private async obterImpactoRemocaoEncarregadoEducacao(idPessoa: number) {
    const [alunosAssociados, inscricoesCoachingAssociadas] = await this.prisma.$transaction([
      this.prisma.aluno.count({
        where: { ID_Enc_Educacao: idPessoa },
      }),
      this.prisma.coaching_Aluno.count({
        where: { ID_Enc_Educacao: idPessoa },
      }),
    ]);

    return {
      alunosAssociados,
      inscricoesCoachingAssociadas,
    };
  }

  private async removerAssociacoesEncarregadoEducacao(idPessoa: number) {
    await this.prisma.coaching_Aluno.updateMany({
      where: { ID_Enc_Educacao: idPessoa },
      data: { ID_Enc_Educacao: null },
    });

    await this.prisma.aluno.updateMany({
      where: { ID_Enc_Educacao: idPessoa },
      data: { ID_Enc_Educacao: null },
    });
  }

}
