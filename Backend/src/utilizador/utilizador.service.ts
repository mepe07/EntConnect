import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePessoalDto } from './dto/update-pessoal.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UpsertEducandoDto } from './dto/upsert-educando.dto';
/**
 * Servico responsavel pela logica de Utilizador.
 */

@Injectable()
export class UtilizadorService {
  private readonly logger = new Logger(UtilizadorService.name);
  private readonly CARGOS_VALIDOS = [
    'Professor',
    'Coordenador',
    'Encarregado de Educa\u00e7\u00e3o',
  ];

  private readonly CARGO_ENCARREGADO_EDUCACAO =
    this.CARGOS_VALIDOS[2];

  constructor(private prisma: PrismaService) {}

  /**
   * Executa a operacao get all users.
   * @returns Resultado da operacao.
   */

  async getAllUsers() {
    const utilizadoresRaw = await this.prisma.utilizador.findMany({
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    return utilizadoresRaw.map((user) => {
      let cargoAtribuido = 'Sem Cargo';

      if (user.Pessoa?.Professor) {
        cargoAtribuido = 'Professor';
      } else if (user.Pessoa?.Coordenador) {
        cargoAtribuido = 'Coordenador';
      } else if (user.Pessoa?.Enc_Educacao) {
        cargoAtribuido = 'Encarregado de Educação';
      }

      const cargos = this.obterCargosDaPessoa(user.Pessoa);

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
        cargos,
      };
    });
  }

  /**
   * Executa a operacao create user.
   * @param createUtilizadorDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async createUser(createUtilizadorDto: CreateUtilizadorDto) {
    const {
      nome,
      username,
      email,
      contacto,
      nif,
      dataNascimento,
      cargo,
      cargos,
      password,
    } = createUtilizadorDto;
    this.logger.log(`A criar utilizador username=${username} cargo=${cargo}`);

    const existente = await this.prisma.utilizador.findFirst({
      where: {
        OR: [{ Utilizador: username }, { Pessoa: { Email: email } }],
      },
    });

    if (existente) {
      this.logger.warn(
        `Criacao de utilizador rejeitada: username/email duplicado username=${username}`,
      );
      throw new ConflictException(
        'Já existe um utilizador com esse username ou email.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
            ...this.criarDadosCargos(this.normalizarCargos(cargos ?? cargo)),
          },
        },
      },
      include: { Pessoa: true },
    });
    this.logger.log(
      `Utilizador criado idUtilizador=${novoUtilizador.ID_Utilizador} username=${novoUtilizador.Utilizador} cargo=${cargo}`,
    );

    return {
      id: novoUtilizador.ID_Utilizador,
      username: novoUtilizador.Utilizador,
      mensagem: `Utilizador "${nome}" criado com sucesso.`,
    };
  }

  /**
   * Executa a operacao get roles ids.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getRolesIds(idUtilizador: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Enc_Educacao: true,
            Coordenador: true,
          },
        },
      },
    });

    if (!utilizador) {
      throw new NotFoundException(
        `Utilizador com ID ${idUtilizador} não encontrado.`,
      );
    }

    return {
      idProfessor: utilizador.Pessoa?.Professor
        ? utilizador.Pessoa.Professor.ID_Pessoa
        : null,
      idEncEducacao: utilizador.Pessoa?.Enc_Educacao
        ? utilizador.Pessoa.Enc_Educacao.ID_Pessoa
        : null,
      idCoordenador: utilizador.Pessoa?.Coordenador
        ? utilizador.Pessoa.Coordenador.ID_Pessoa
        : null,
      idPessoaBase: utilizador.ID_Pessoa,
    };
  }

  /**
   * Executa a operacao block user.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async blockUser(id: number) {
    this.logger.log(`A bloquear utilizador idUtilizador=${id}`);
    const utilizador = await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Ativo: false },
    });
    this.logger.log(`Utilizador bloqueado idUtilizador=${id}`);
    return utilizador;
  }

  /**
   * Executa a operacao unlock user.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async unlockUser(id: number) {
    this.logger.log(`A desbloquear utilizador idUtilizador=${id}`);
    const utilizador = await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Ativo: true },
    });
    this.logger.log(`Utilizador desbloqueado idUtilizador=${id}`);
    return utilizador;
  }

  /**
   * Executa a operacao update password.
   * @param id Dados recebidos para a operacao.
   * @param plainPassword Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updatePassword(id: number, plainPassword: string) {
    this.logger.log(`A atualizar password por administracao idUtilizador=${id}`);

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });

    if (!utilizador) {
      this.logger.warn(
        `Atualizacao de password rejeitada: utilizador inexistente idUtilizador=${id}`,
      );
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const atualizado = await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Password: hashedPassword },
    });
    this.logger.log(`Password atualizada por administracao idUtilizador=${id}`);
    return atualizado;
  }

  /**
   * Executa a operacao upload photo.
   * @param url Dados recebidos para a operacao.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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
      },
    });
  }

  /**
   * Executa a operacao remove photo.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async RemovePhoto(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      select: { ID_Pessoa: true },
    });

    if (!utilizador) {
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }

    return this.prisma.pessoa.update({
      where: { ID_Pessoa: utilizador.ID_Pessoa },
      data: { Foto: null },
    });
  }

  /**
   * Executa a operacao get foto perfil.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getFotoPerfil(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: { Pessoa: true },
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    return {
      id: id,
      url: utilizador.Pessoa.Foto || null,
      mensagem: utilizador.Pessoa.Foto
        ? 'Foto encontrada.'
        : 'Este utilizador não tem foto de perfil.',
    };
  }

  /**
   * Executa a operacao get meus coachings.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getMeusCoachings(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException(`Utilizador não encontrado.`);
    }

    const idPessoa = utilizador.ID_Pessoa;

    if (utilizador.Pessoa.Professor) {
      const coachingsProfessor = await this.prisma.coaching.findMany({
        where: { ID_Professor: utilizador.Pessoa.Professor.ID_Pessoa },
        include: {
          Sala: true,

          Coaching_Aluno: {
            include: { Aluno: true },
          },
        },
        orderBy: { Inicio_Coaching: 'asc' },
      });

      return coachingsProfessor.map((coaching) => {
        let dataStr = 'Data a definir';
        let horaInicio = '--:--';
        let horaFim = '--:--';

        if (coaching.Inicio_Coaching) {
          try {
            dataStr = coaching.Inicio_Coaching.toLocaleDateString('pt-PT');
            horaInicio = coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const duracaoMinutos = coaching.Duracao || 60;
            const horaFimObj = new Date(
              coaching.Inicio_Coaching.getTime() + duracaoMinutos * 60000,
            );
            horaFim = horaFimObj.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch (e) {
            console.error('Erro ao formatar data de coaching', e);
          }
        }

        let nomeBailarino = 'Sem bailarino associado';
        if (coaching.Coaching_Aluno && coaching.Coaching_Aluno.length > 0) {
          nomeBailarino = coaching.Coaching_Aluno.map(
            (ca: any) => ca.Aluno?.Nome || 'Desconhecido',
          ).join(', ');
        }

        return {
          tema: 'Sessão de Coaching',
          bailarino: nomeBailarino,
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: coaching.Sala?.Nome || 'Estúdio a definir',
        };
      });
    } else if (utilizador.Pessoa.Enc_Educacao) {
      const coachingsEducando = await this.prisma.coaching.findMany({
        where: {
          Coaching_Aluno: {
            some: {
              ID_Enc_Educacao: idPessoa,
            },
          },
        },
        include: {
          Professor: { include: { Pessoa: true } },
          Sala: true,

          Coaching_Aluno: {
            include: { Aluno: true },
          },
        },
        orderBy: { Inicio_Coaching: 'asc' },
      });

      return coachingsEducando.map((coaching) => {
        let dataStr = 'Data a definir';
        let horaInicio = '--:--';
        let horaFim = '--:--';

        if (coaching.Inicio_Coaching) {
          try {
            dataStr = coaching.Inicio_Coaching.toLocaleDateString('pt-PT');
            horaInicio = coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const duracaoMinutos = coaching.Duracao || 60;
            const horaFimObj = new Date(
              coaching.Inicio_Coaching.getTime() + duracaoMinutos * 60000,
            );
            horaFim = horaFimObj.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch (e) {
            console.error('Erro ao formatar data de coaching', e);
          }
        }

        let nomeBailarino = '';
        if (coaching.Coaching_Aluno && coaching.Coaching_Aluno.length > 0) {
          nomeBailarino = coaching.Coaching_Aluno.map(
            (ca: any) => ca.Aluno?.Nome || '',
          )
            .filter(Boolean)
            .join(', ');
        }

        const nomeCoach =
          (coaching.Professor as any)?.Pessoa?.Nome || 'Coach a definir';
        const temaFormatado = nomeBailarino
          ? `Coaching - ${nomeBailarino}`
          : 'Sessão de Coaching';

        return {
          tema: temaFormatado,
          coach: nomeCoach,
          data: dataStr,
          horario: `${horaInicio} - ${horaFim}`,
          formato: coaching.Sala?.Nome || 'Estúdio a definir',
        };
      });
    }

    return [];
  }

  /**
   * Executa a operacao get alunos by ee.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getAlunosByEE(idEncEducacao: number) {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: idEncEducacao },
      orderBy: { Nome: 'asc' },
    });
  }

  /**
   * Executa a operacao get alunos sem encarregado.
   * @returns Resultado da operacao.
   */

  async getAlunosSemEncarregado() {
    return this.prisma.aluno.findMany({
      where: { ID_Enc_Educacao: null },
      orderBy: { Nome: 'asc' },
    });
  }

  /**
   * Executa a operacao criar educando.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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

  /**
   * Executa a operacao atualizar educando.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async atualizarEducando(
    idEncEducacao: number,
    idAluno: number,
    dto: UpsertEducandoDto,
  ) {
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

  /**
   * Executa a operacao remover educando.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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

    return {
      mensagem: 'Educando removido do encarregado de educacao com sucesso.',
    };
  }

  /**
   * Executa a operacao associar educando.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async associarEducando(idEncEducacao: number, idAluno: number) {
    await this.garantirEncarregadoEducacao(idEncEducacao);

    const aluno = await this.prisma.aluno.findUnique({
      where: { ID_aluno: idAluno },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno nao encontrado.');
    }

    if (aluno.ID_Enc_Educacao) {
      throw new ConflictException(
        'Este aluno ja esta associado a um encarregado de educacao.',
      );
    }

    return this.prisma.aluno.update({
      where: { ID_aluno: idAluno },
      data: { ID_Enc_Educacao: idEncEducacao },
    });
  }

  /**
   * Executa a operacao garantir encarregado educacao.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async garantirEncarregadoEducacao(idEncEducacao: number) {
    const encarregado = await this.prisma.enc_Educacao.findUnique({
      where: { ID_Pessoa: idEncEducacao },
    });

    if (!encarregado) {
      throw new NotFoundException('Encarregado de educacao nao encontrado.');
    }

    return encarregado;
  }

  /**
   * Executa a operacao garantir aluno do encarregado.
   * @param idEncEducacao Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async garantirAlunoDoEncarregado(
    idEncEducacao: number,
    idAluno: number,
  ) {
    await this.garantirEncarregadoEducacao(idEncEducacao);

    const aluno = await this.prisma.aluno.findFirst({
      where: {
        ID_aluno: idAluno,
        ID_Enc_Educacao: idEncEducacao,
      },
    });

    if (!aluno) {
      throw new NotFoundException(
        'Educando nao encontrado para este encarregado de educacao.',
      );
    }

    return aluno;
  }

  /**
   * Executa a operacao calcular menor idade.
   * @param dataNascimento Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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

  /**
   * Executa a operacao update dados pessoais.
   * @param idUtilizador Dados recebidos para a operacao.
   * @param updateDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updateDadosPessoais(idUtilizador: number, updateDto: UpdatePessoalDto) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
    });

    if (!utilizador || !utilizador.ID_Pessoa) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    return this.prisma.pessoa.update({
      where: { ID_Pessoa: utilizador.ID_Pessoa },
      data: {
        Nome: updateDto.nome,
        NIF: updateDto.nif,
        Contacto: updateDto.contacto,
      },
    });
  }

  /**
   * Obtem um registo pelo identificador.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async findOne(id: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador) throw new NotFoundException('Utilizador não encontrado');
    return utilizador;
  }

  async updateCargos(
    idUtilizador: number,
    novosCargosPayload: string | string[],
    confirmarRemocaoAssociacoes = false,
  ) {
    const novosCargos = this.normalizarCargos(novosCargosPayload);
    const cargoEncarregadoEducacao = this.CARGO_ENCARREGADO_EDUCACAO;

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador || !utilizador.Pessoa) {
      throw new NotFoundException('Utilizador nÃ£o encontrado.');
    }

    const idPessoa = utilizador.ID_Pessoa;
    const pessoa = utilizador.Pessoa;
    const cargosAtuais = this.obterCargosDaPessoa(pessoa);
    const removeEncarregadoEducacao =
      cargosAtuais.includes(cargoEncarregadoEducacao) &&
      !novosCargos.includes(cargoEncarregadoEducacao);

    if (removeEncarregadoEducacao) {
      const impacto =
        await this.obterImpactoRemocaoEncarregadoEducacao(idPessoa);

      if (
        (impacto.alunosAssociados > 0 ||
          impacto.inscricoesCoachingAssociadas > 0) &&
        !confirmarRemocaoAssociacoes
      ) {
        throw new ConflictException({
          code: 'CONFIRMACAO_REMOCAO_ASSOCIACOES_ENCARREGADO',
          message:
            'Este utilizador tem alunos ou inscricoes de coaching associadas enquanto encarregado de educacao.',
          impacto,
        });
      }
    }

    if (pessoa.Professor && !novosCargos.includes('Professor'))
      await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador && !novosCargos.includes('Coordenador'))
      await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao && removeEncarregadoEducacao) {
      await this.removerAssociacoesEncarregadoEducacao(idPessoa);
      await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });
    }

    if (!pessoa.Professor && novosCargos.includes('Professor'))
      await this.prisma.professor.create({ data: { ID_Pessoa: idPessoa } });
    if (!pessoa.Coordenador && novosCargos.includes('Coordenador'))
      await this.prisma.coordenador.create({ data: { ID_Pessoa: idPessoa } });
    if (!pessoa.Enc_Educacao && novosCargos.includes(cargoEncarregadoEducacao))
      await this.prisma.enc_Educacao.create({ data: { ID_Pessoa: idPessoa } });

    return {
      mensagem: `Cargos atualizados para "${novosCargos.join(', ')}" com sucesso.`,
      cargos: novosCargos,
    };
  }

  /**
   * Executa a operacao update cargo.
   * @param idUtilizador Dados recebidos para a operacao.
   * @param novoCargo Dados recebidos para a operacao.
   * @param confirmarRemocaoAssociacoes Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updateCargo(
    idUtilizador: number,
    novoCargo: string,
    confirmarRemocaoAssociacoes = false,
  ) {
    const cargosValidos = [
      'Professor',
      'Coordenador',
      'Encarregado de Educação',
    ];
    const cargoEncarregadoEducacao = cargosValidos[2];
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
      const impacto =
        await this.obterImpactoRemocaoEncarregadoEducacao(idPessoa);

      if (
        (impacto.alunosAssociados > 0 ||
          impacto.inscricoesCoachingAssociadas > 0) &&
        !confirmarRemocaoAssociacoes
      ) {
        throw new ConflictException({
          code: 'CONFIRMACAO_REMOCAO_ASSOCIACOES_ENCARREGADO',
          message:
            'Este utilizador tem alunos ou inscricoes de coaching associadas enquanto encarregado de educacao.',
          impacto,
        });
      }
    }

    if (pessoa.Professor)
      await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador)
      await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao) {
      await this.removerAssociacoesEncarregadoEducacao(idPessoa);
      await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });
    }

    if (novoCargo === 'Professor')
      await this.prisma.professor.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === 'Coordenador')
      await this.prisma.coordenador.create({ data: { ID_Pessoa: idPessoa } });
    else if (novoCargo === cargoEncarregadoEducacao)
      await this.prisma.enc_Educacao.create({ data: { ID_Pessoa: idPessoa } });

    return { mensagem: `Cargo atualizado para "${novoCargo}" com sucesso.` };
  }

  /**
   * Executa a operacao mudar password.
   * @param id Dados recebidos para a operacao.
   * @param dto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async mudarPassword(id: number, dto: ChangePasswordDto) {
    this.logger.log(`A mudar password pelo proprio utilizador idUtilizador=${id}`);

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });

    if (!utilizador) {
      this.logger.warn(
        `Mudanca de password rejeitada: utilizador inexistente idUtilizador=${id}`,
      );
      throw new NotFoundException('Utilizador não encontrado');
    }

    const passValida = await bcrypt.compare(dto.passAtual, utilizador.Password);

    if (!passValida) {
      this.logger.warn(
        `Mudanca de password rejeitada: password atual invalida idUtilizador=${id}`,
      );
      throw new UnauthorizedException('A password atual está incorreta.');
    }

    const saltRounds = 10;
    const novaHash = await bcrypt.hash(dto.passNova, saltRounds);

    await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: { Password: novaHash },
    });
    this.logger.log(`Password alterada pelo proprio utilizador idUtilizador=${id}`);

    return { message: 'Password alterada com sucesso!' };
  }

  /**
   * Executa a operacao update preferencias acoes.
   * @param id Dados recebidos para a operacao.
   * @param acoesIds Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async updatePreferenciasAcoes(id: number, acoesIds: number[]) {
    this.logger.log(
      `A atualizar preferencias de acoes idUtilizador=${id} totalAcoes=${acoesIds.length}`,
    );

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: id },
    });

    if (!utilizador) {
      this.logger.warn(
        `Atualizacao de preferencias rejeitada: utilizador inexistente idUtilizador=${id}`,
      );
      throw new NotFoundException(`Utilizador com ID ${id} não encontrado.`);
    }

    const preferenciasJson = JSON.stringify(acoesIds);

    const atualizado = await this.prisma.utilizador.update({
      where: { ID_Utilizador: id },
      data: {
        Acoes_Rapidas: preferenciasJson,
      },
    });
    this.logger.log(`Preferencias de acoes atualizadas idUtilizador=${id}`);
    return atualizado;
  }

  /**
   * Executa a operacao delete user.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async deleteUser(idUtilizador: number) {
    this.logger.log(`A eliminar utilizador idUtilizador=${idUtilizador}`);

    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Enc_Educacao: true,
          },
        },
      },
    });

    if (!utilizador || !utilizador.Pessoa) {
      this.logger.warn(
        `Eliminacao de utilizador rejeitada: inexistente idUtilizador=${idUtilizador}`,
      );
      throw new NotFoundException('Utilizador não encontrado.');
    }

    const idPessoa = utilizador.ID_Pessoa;
    const pessoa = utilizador.Pessoa;

    if (pessoa.Professor)
      await this.prisma.professor.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Coordenador)
      await this.prisma.coordenador.delete({ where: { ID_Pessoa: idPessoa } });
    if (pessoa.Enc_Educacao) {
      await this.removerAssociacoesEncarregadoEducacao(idPessoa);
      await this.prisma.enc_Educacao.delete({ where: { ID_Pessoa: idPessoa } });
    }

    await this.prisma.utilizador.delete({
      where: { ID_Utilizador: idUtilizador },
    });

    await this.prisma.pessoa.delete({ where: { ID_Pessoa: idPessoa } });
    this.logger.log(
      `Utilizador eliminado idUtilizador=${idUtilizador} idPessoa=${idPessoa}`,
    );

    return { mensagem: 'Utilizador eliminado com sucesso.' };
  }

  /**
   * Executa a operacao get faturas encarregado.
   * @param idUtilizador Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getFaturasEncarregado(idUtilizador: number) {
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      select: { ID_Pessoa: true },
    });

    if (!utilizador) {
      return [];
    }

    const faturas = await this.prisma.coaching_Aluno.findMany({
      where: {
        ID_Enc_Educacao: utilizador.ID_Pessoa,
      },
      include: {
        Aluno: true,
        Coaching: {
          include: {
            Disponibilidade: true,
          },
        },
      },
    });

    return faturas.map((f) => {
      const valorEmFaltaNum = f.ValorEmFalta ? Number(f.ValorEmFalta) : 0;
      const isEmDivida = valorEmFaltaNum > 0;

      const modalidadeOficial = (f as any).Coaching?.Disponibilidade
        ?.Modalidade;
      const nomeBailarino = (f as any).Aluno?.Nome || 'Aluno';

      const modalidadeDisplay = modalidadeOficial
        ? `${modalidadeOficial} - ${nomeBailarino}`
        : f.Observacoes || `Coaching - ${nomeBailarino}`;

      return {
        Data: f.Data_Inscricao,
        Descricao: modalidadeDisplay,
        Valor: valorEmFaltaNum,
        Pago: !isEmDivida,
        estado: isEmDivida ? 'EM DÍVIDA' : 'PAGO',
      };
    });
  }

  private obterCargosDaPessoa(pessoa: any): string[] {
    const cargos: string[] = [];

    if (pessoa?.Professor) cargos.push('Professor');
    if (pessoa?.Coordenador) cargos.push('Coordenador');
    if (pessoa?.Enc_Educacao) cargos.push(this.CARGO_ENCARREGADO_EDUCACAO);

    return cargos;
  }

  private canonicalizarCargo(cargo: string): string {
    const cargoLimpo = cargo.trim();
    const aliases: Record<string, string> = {
      'Encarregado de Educa\u00e7\u00e3o': this.CARGO_ENCARREGADO_EDUCACAO,
      'Encarregado de EducaÃ§Ã£o': this.CARGO_ENCARREGADO_EDUCACAO,
      'Encarregado de EducaÃƒÂ§ÃƒÂ£o': this.CARGO_ENCARREGADO_EDUCACAO,
    };

    return aliases[cargoLimpo] ?? cargoLimpo;
  }

  private normalizarCargos(cargos: string | string[] | undefined): string[] {
    const lista = Array.isArray(cargos) ? cargos : cargos ? [cargos] : [];
    const cargosNormalizados = [
      ...new Set(lista.map((cargo) => this.canonicalizarCargo(cargo))),
    ];

    if (cargosNormalizados.length === 0) {
      throw new BadRequestException('Seleciona pelo menos um cargo.');
    }

    const cargoInvalido = cargosNormalizados.find(
      (cargo) => !this.CARGOS_VALIDOS.includes(cargo),
    );

    if (cargoInvalido) {
      throw new NotFoundException(`Cargo "${cargoInvalido}" nao e valido.`);
    }

    return cargosNormalizados;
  }

  private criarDadosCargos(cargos: string[]) {
    return {
      ...(cargos.includes('Professor') ? { Professor: { create: {} } } : {}),
      ...(cargos.includes('Coordenador')
        ? { Coordenador: { create: {} } }
        : {}),
      ...(cargos.includes(this.CARGO_ENCARREGADO_EDUCACAO)
        ? { Enc_Educacao: { create: {} } }
        : {}),
    };
  }

  /**
   * Executa a operacao obter impacto remocao encarregado educacao.
   * @param idPessoa Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  private async obterImpactoRemocaoEncarregadoEducacao(idPessoa: number) {
    const [alunosAssociados, inscricoesCoachingAssociadas] =
      await this.prisma.$transaction([
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

  /**
   * Executa a operacao remover associacoes encarregado educacao.
   * @param idPessoa Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

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
