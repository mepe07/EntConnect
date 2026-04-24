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

}

