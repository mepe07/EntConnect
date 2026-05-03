import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePessoalDto } from './dto/update-pessoal.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

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
  
  
  async getMeusCoachings(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Enc_Educacao: true 
          }
        }
      }
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException(`Utilizador não encontrado.`);
    }

    const idPessoa = utilizador.ID_Pessoa;

    // ========================================================
    // 1. LÓGICA PARA PROFESSORES (COACHES)
    // ========================================================
    if (utilizador.Pessoa.Professor) {
      const coachingsProfessor = await this.prisma.coaching.findMany({
        where: { ID_Professor: utilizador.Pessoa.Professor.ID_Pessoa }, 
        include: {
          Sala: true,
          // Vamos buscar a tabela intermédia que vimos no teu print!
          Coaching_Aluno: { 
            include: { Aluno: true } 
          }
        },
        orderBy: { Inicio_Coaching: 'asc' }
      });

      return coachingsProfessor.map(coaching => {
        let dataStr = 'Data a definir';
        let horaInicio = '--:--';
        let horaFim = '--:--';
        
        if (coaching.Inicio_Coaching) {
          try {
            dataStr = coaching.Inicio_Coaching.toLocaleDateString('pt-PT');
            horaInicio = coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            
            const duracaoMinutos = coaching.Duracao || 60; 
            const horaFimObj = new Date(coaching.Inicio_Coaching.getTime() + duracaoMinutos * 60000);
            horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            console.error('Erro ao formatar data de coaching', e);
          }
        }

        // Ir buscar os nomes através da tabela intermédia Coaching_Aluno
        let nomeBailarino = 'Sem bailarino associado';
        if (coaching.Coaching_Aluno && coaching.Coaching_Aluno.length > 0) {
          nomeBailarino = coaching.Coaching_Aluno.map((ca: any) => ca.Aluno?.Nome || 'Desconhecido').join(', ');
        } 

        return {
          // Como não tens Tema na BD, usamos o padrão fixo
          tema: 'Sessão de Coaching', 
          bailarino: nomeBailarino,
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: coaching.Sala?.Nome || 'Estúdio a definir' 
        };
      });
    } 
    
    // ========================================================
    // 2. LÓGICA PARA ENCARREGADOS DE EDUCAÇÃO (ALUNOS)
    // ========================================================
    else if (utilizador.Pessoa.Enc_Educacao) {
      
      const coachingsEducando = await this.prisma.coaching.findMany({
        where: {
          // A magia acontece aqui: Filtramos pela coluna ID_Enc_Educacao que vimos no print!
          Coaching_Aluno: {
            some: {
              ID_Enc_Educacao: idPessoa
            }
          }
        },
        include: {
          Professor: { include: { Pessoa: true } },
          Sala: true,
          // Precisamos da tabela intermédia na mesma para saber o nome da criança
          Coaching_Aluno: {
            include: { Aluno: true }
          }
        },
        orderBy: { Inicio_Coaching: 'asc' }
      });

      return coachingsEducando.map(coaching => {
        let dataStr = 'Data a definir';
        let horaInicio = '--:--';
        let horaFim = '--:--';
        
        if (coaching.Inicio_Coaching) {
          try {
            dataStr = coaching.Inicio_Coaching.toLocaleDateString('pt-PT');
            horaInicio = coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            
            const duracaoMinutos = coaching.Duracao || 60;
            const horaFimObj = new Date(coaching.Inicio_Coaching.getTime() + duracaoMinutos * 60000);
            horaFim = horaFimObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            console.error('Erro ao formatar data de coaching', e);
          }
        }

        let nomeBailarino = '';
        if (coaching.Coaching_Aluno && coaching.Coaching_Aluno.length > 0) {
          nomeBailarino = coaching.Coaching_Aluno.map((ca: any) => ca.Aluno?.Nome || '').filter(Boolean).join(', ');
        }

        const nomeCoach = (coaching.Professor as any)?.Pessoa?.Nome || 'Coach a definir';
        const temaFormatado = nomeBailarino ? `Coaching - ${nomeBailarino}` : 'Sessão de Coaching';

        return {
          tema: temaFormatado,
          coach: nomeCoach,
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: coaching.Sala?.Nome || 'Estúdio a definir'
        };
      });
    }

    return [];
  }

  async getAlunosByEE(idEncEducacao: number) {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: idEncEducacao }
    });
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

  async updateCargo(idUtilizador: number, novoCargo: string) {
    const cargosValidos = ['Professor', 'Coordenador', 'Direção', 'Encarregado de Educação'];
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

    // Apagar o cargo atual (apenas o que existir)
    if (pessoa.Professor)    await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador)  await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Direcao)      await this.prisma.direcao.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao) await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });

    // Criar o novo cargo
    if (novoCargo === 'Professor')                 await this.prisma.professor.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Coordenador')          await this.prisma.coordenador.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Direção')              await this.prisma.direcao.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Encarregado de Educação') await this.prisma.enc_Educacao.create({ data: { ID_Pessoa: idPessoa } });

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


  async updatePreferenciasAcoes(id: number, acoesIds: number[]) {
    // 1. Verificar se o utilizador existe
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });

    if (!utilizador) {
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }

    // 2. Converter o array para String JSON
    const preferenciasJson = JSON.stringify(acoesIds);

    // 3. Atualizar a coluna na base de dados (Nome correto aqui!)
    return this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: {
        Acoes_Rapidas: preferenciasJson, 
      },
    });
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
    if (pessoa.Enc_Educacao) await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });

    // Apagar Utilizador (FK para Pessoa)
    await this.prisma.utilizador.delete({ where: { ID_Utilizador: idUtilizador } });

    // Apagar Pessoa
    await this.prisma.pessoa.delete({ where: { ID_Pessoa: idPessoa } });

    return { mensagem: 'Utilizador eliminado com sucesso.' };
  }

  async getFaturasEncarregado(idUtilizador: number) {
  const utilizador = await this.prisma.utilizador.findUnique({
    where: { ID_Utilizador: idUtilizador },
    select: { ID_Pessoa: true }
  });

  if (!utilizador) {
    return [];
  }

  // 1. Dizer ao Prisma para ir buscar os dados cruzados até à Disponibilidade
  const faturas = await this.prisma.coaching_Aluno.findMany({
    where: { 
      ID_Enc_Educacao: utilizador.ID_Pessoa 
    },
    include: { 
      Aluno: true,
      Coaching: {
        include: {
          Disponibilidade: true // <-- Traz a Modalidade!
        }
      }
    }
  });

  return faturas.map(f => {
    const valorEmFaltaNum = f.ValorEmFalta ? Number(f.ValorEmFalta) : 0;
    const isEmDivida = valorEmFaltaNum > 0;
    
    // 2. Ir buscar a Modalidade à tabela Disponibilidade (com fallback de segurança)
    // Se o TypeScript refilar com os tipos, usamos as any para garantir que compila
    const modalidadeOficial = (f as any).Coaching?.Disponibilidade?.Modalidade;
    const nomeBailarino = (f as any).Aluno?.Nome || 'Aluno';
    
    // Cria uma string final bonita: "Ballet - Ana Malhoa" ou apenas a Modalidade
    const modalidadeDisplay = modalidadeOficial 
      ? `${modalidadeOficial} - ${nomeBailarino}` 
      : f.Observacoes || `Coaching - ${nomeBailarino}`;

    return {
      Data: f.Data_Inscricao,
      Descricao: modalidadeDisplay, // O React usa isto para a coluna "Modalidade"
      Valor: valorEmFaltaNum,
      Pago: !isEmDivida,
      estado: isEmDivida ? 'EM DÍVIDA' : 'PAGO'
    };
  });
}


}