import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UtilizadorService } from './utilizador.service';

// Mock global da biblioteca bcrypt para não executar hashes reais durante os testes
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UtilizadorService (Testes Unitários)', () => {
  let service: UtilizadorService;

  // Configura um mock detalhado para o Prisma, simulando todos os modelos necessários
  const prismaMock = {
    utilizador: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pessoa: { update: jest.fn(), delete: jest.fn() },
    aluno: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    enc_Educacao: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    professor: { create: jest.fn(), delete: jest.fn() },
    coordenador: { create: jest.fn(), delete: jest.fn() },
    coaching: { findMany: jest.fn() },
    coaching_Aluno: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    // Inicializa o módulo de teste injetando o mock do Prisma
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilizadorService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UtilizadorService>(UtilizadorService);
    
    // Limpa o estado dos mocks antes de cada teste
    jest.resetAllMocks();
    
    // Configura o comportamento padrão do bcrypt e das transações do Prisma
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.$transaction.mockResolvedValue([0, 0]);
  });

  // ---------------------------------------------------------------------------
  // BLOCO 1: Gestão de Utilizadores (Consultas e Criação)
  // ---------------------------------------------------------------------------
  describe('Gestão de Utilizadores (Consultas e Criação)', () => {
    it('deve mapear corretamente a lista de utilizadores e os respetivos cargos', async () => {
      // Prepara o cenário simulando um utilizador devolvido pela base de dados
      prismaMock.utilizador.findMany.mockResolvedValue([
        {
          ID_Utilizador: 1,
          ID_Pessoa: 10,
          Utilizador: 'ana',
          Ativo: true,
          Pessoa: {
            Nome: 'Ana',
            Email: 'ana@test',
            Contacto: '910',
            NIF: '123',
            Professor: {}, // Simula que é professora
            Coordenador: null,
            Enc_Educacao: null,
          },
        },
      ]);

      // Executa e valida se o serviço mapeia o cargo corretamente para 'Professor'
      await expect(service.getAllUsers()).resolves.toEqual([
        expect.objectContaining({
          idUtilizador: 1,
          cargo: 'Professor',
          nome: 'Ana',
        }),
      ]);
    });

    it('deve criar um utilizador com sucesso se os dados forem válidos e únicos', async () => {
      const dtoNovoUtilizador = {
        nome: 'Ana',
        username: 'ana',
        email: 'ana@test',
        contacto: '910',
        nif: '123',
        dataNascimento: '1990-01-01',
        cargo: 'Professor',
        password: 'pass',
      };
      
      // Simula que não existe nenhum utilizador com o mesmo username
      prismaMock.utilizador.findFirst.mockResolvedValueOnce(null);
      prismaMock.utilizador.create.mockResolvedValue({
        ID_Utilizador: 1,
        Utilizador: 'ana',
      });

      // Valida a criação com sucesso
      await expect(service.createUser(dtoNovoUtilizador)).resolves.toEqual({
        id: 1,
        username: 'ana',
        mensagem: 'Utilizador "Ana" criado com sucesso.',
      });
    });

    it('deve rejeitar a criação de um utilizador se o username já existir', async () => {
      const dtoNovoUtilizador = {
        nome: 'Ana',
        username: 'ana',
        email: 'ana@test',
        contacto: '910',
        nif: '123',
        dataNascimento: '1990-01-01',
        cargo: 'Professor',
        password: 'pass',
      };
      
      // Simula que já existe um utilizador com este username
      prismaMock.utilizador.findFirst.mockResolvedValueOnce({ ID_Utilizador: 1 });
      
      // Valida se o serviço lança um ConflictException
      await expect(service.createUser(dtoNovoUtilizador)).rejects.toThrow(ConflictException);
    });

    it('deve eliminar um utilizador existente', async () => {
      // Prepara o cenário simulando um utilizador válido e sem associações impeditivas
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Pessoa: 10,
        Pessoa: { Professor: {}, Coordenador: null, Enc_Educacao: null },
      });

      // Valida a execução com sucesso
      await expect(service.deleteUser(1)).resolves.toEqual({
        mensagem: 'Utilizador eliminado com sucesso.',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BLOCO 2: Estado e Credenciais (Acessos e Passwords)
  // ---------------------------------------------------------------------------
  describe('Estado e Credenciais (Acessos e Passwords)', () => {
    
    it('deve bloquear um utilizador definindo o seu estado para inativo', async () => {
      prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 });

      await service.blockUser(1);

      expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
        where: { ID_Utilizador: 1 },
        data: { Ativo: false },
      });
    });

    it('deve desbloquear um utilizador definindo o seu estado para ativo', async () => {
      prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 });

      await service.unlockUser(1);

      expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
        where: { ID_Utilizador: 1 },
        data: { Ativo: true },
      });
    });

    it('deve forçar a atualização da password de um utilizador', async () => {
      prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 });
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Password: 'old',
      });

      await service.updatePassword(1, 'nova');

      expect(prismaMock.utilizador.update).toHaveBeenCalledWith({
        where: { ID_Utilizador: 1 },
        data: { Password: 'hash' },
      });
    });

    it('deve permitir a alteração de password pelo próprio utilizador se a atual estiver correta', async () => {
      // Prepara o cenário com a password antiga hasheada
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Password: 'hash-antiga',
      });

      // Valida o caso de sucesso (o bcrypt.compare devolve true por defeito no beforeEach)
      await expect(
        service.mudarPassword(1, { passAtual: 'antiga', passNova: 'nova' }),
      ).resolves.toEqual({
        message: 'Password alterada com sucesso!',
      });
    });

    it('deve rejeitar a alteração de password se a password atual enviada estiver incorreta', async () => {
      // Prepara o cenário simulando o utilizador existente
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Utilizador: 1,
        Password: 'hash-antiga',
      });

      // Simula falha na verificação da password atual
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Valida se lança erro de autorização
      await expect(
        service.mudarPassword(1, { passAtual: 'errada', passNova: 'nova' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------------
  // BLOCO 3: Gestão de Perfil (Cargos e Foto)
  // ---------------------------------------------------------------------------
  describe('Gestão de Perfil (Cargos e Foto)', () => {
    it('deve obter os IDs dos diferentes roles de um utilizador com sucesso', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValueOnce({
        ID_Pessoa: 10,
        Pessoa: {
          Professor: { ID_Pessoa: 10 },
          Enc_Educacao: null,
          Coordenador: null,
        },
      });

      await expect(service.getRolesIds(1)).resolves.toEqual({
        idProfessor: 10,
        idEncEducacao: null,
        idCoordenador: null,
        idPessoaBase: 10,
      });
    });

    it('deve rejeitar a obtenção de roles se o utilizador não existir', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValueOnce(null);
      
      await expect(service.getRolesIds(99)).rejects.toThrow(NotFoundException);
    });

    it('deve atualizar um cargo singular de um utilizador com sucesso', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Pessoa: 10,
        Pessoa: { Professor: {}, Coordenador: null, Enc_Educacao: null },
      });

      await expect(service.updateCargo(1, 'Coordenador')).resolves.toEqual({
        mensagem: 'Cargo atualizado para "Coordenador" com sucesso.',
      });
    });

    it('deve gerir múltiplos cargos ignorando a opção "Sem Cargo" quando acompanhada de outros', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValue({
        ID_Pessoa: 10,
        Pessoa: { Professor: null, Coordenador: null, Enc_Educacao: null },
      });

      await expect(
        service.updateCargos(1, ['Sem Cargo', 'Professor']),
      ).resolves.toEqual({
        mensagem: 'Cargos atualizados para "Professor" com sucesso.',
        cargos: ['Professor'],
      });
      
      expect(prismaMock.professor.create).toHaveBeenCalledWith({
        data: { ID_Pessoa: 10 },
      });
    });

    it('deve rejeitar a atribuição exclusiva de "Sem Cargo" se for o único cargo no array', async () => {
      await expect(service.updateCargos(1, 'Sem Cargo')).rejects.toThrow(BadRequestException);
      expect(prismaMock.utilizador.findUnique).not.toHaveBeenCalled();
    });

    it('deve fazer upload de uma foto de perfil com sucesso', async () => {
      // Simula a resposta da BD (ajusta se o teu serviço esperar uma estrutura diferente)
      prismaMock.utilizador.findUnique.mockResolvedValueOnce({ ID_Pessoa: 10 });
      prismaMock.utilizador.update.mockResolvedValue({ ID_Utilizador: 1 }); 

      // Executa a função sem o expect embutido para isolar o comportamento
      await service.UploadPhoto('url_da_imagem', 1);

      // Verifica se foi o utilizador.update a ser chamado
      expect(prismaMock.utilizador.update).toHaveBeenCalled();
    });

    it('deve remover a foto de perfil do utilizador definindo-a como null', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValueOnce({ ID_Pessoa: 10 });
      prismaMock.pessoa.update.mockResolvedValue({ ID_Pessoa: 10, Foto: null });

      await expect(service.RemovePhoto(1)).resolves.not.toThrow();
      expect(prismaMock.pessoa.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { Foto: null } })
      );
    });

    it('deve obter o link da foto de perfil atual do utilizador', async () => {
      prismaMock.utilizador.findUnique.mockResolvedValueOnce({ Pessoa: { Foto: 'minha_foto.jpg' } });

      await expect(service.getFotoPerfil(1)).resolves.toEqual({
        id: 1,
        url: 'minha_foto.jpg',
        mensagem: 'Foto encontrada.',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BLOCO 4: Gestão de Educandos (Apenas para Encarregados de Educação)
  // ---------------------------------------------------------------------------
  describe('Gestão de Educandos', () => {
    
    it('deve consultar e devolver a lista de educandos associados a um encarregado', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.findMany.mockResolvedValue([{ ID_aluno: 1, Nome: 'Aluno 1' }]);

      const resultado = await service.getAlunosByEE(10);

      expect(prismaMock.aluno.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ID_Enc_Educacao: 10 } })
      );
      expect(resultado).toHaveLength(1);
    });

    it('deve obter os alunos que ainda não têm um encarregado associado', async () => {
      prismaMock.aluno.findMany.mockResolvedValue([{ ID_aluno: 2, Nome: 'Aluno Solto' }]);

      const resultado = await service.getAlunosSemEncarregado();

      expect(prismaMock.aluno.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ID_Enc_Educacao: null } })
      );
      expect(resultado).toHaveLength(1);
    });

    it('deve criar um novo educando e associá-lo automaticamente ao encarregado', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.create.mockResolvedValue({ ID_aluno: 3 });

      await expect(service.criarEducando(10, {
        nome: 'Novo Aluno',
        dataNascimento: '2015-01-01',
        nif: '123456789',
      } as any)).resolves.not.toThrow();

      expect(prismaMock.aluno.create).toHaveBeenCalled();
    });

    it('deve atualizar os dados de um educando pertencente ao encarregado', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.findFirst.mockResolvedValue({ ID_aluno: 1, ID_Enc_Educacao: 10 });
      prismaMock.aluno.update.mockResolvedValue({ ID_aluno: 1 });

      await expect(service.atualizarEducando(10, 1, {
        nome: 'Aluno Modificado',
        dataNascimento: '2015-01-01',
        nif: '111',
      } as any)).resolves.not.toThrow();

      expect(prismaMock.aluno.update).toHaveBeenCalled();
    });

    it('deve remover a associação de um educando ao encarregado de educação', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.findFirst.mockResolvedValue({ ID_aluno: 1, ID_Enc_Educacao: 10 });
      prismaMock.aluno.update.mockResolvedValue({ ID_aluno: 1, ID_Enc_Educacao: null });

      await expect(service.removerEducando(10, 1)).resolves.toEqual({
        mensagem: 'Educando removido do encarregado de educacao com sucesso.',
      });
    });

    it('deve associar um educando existente (sem encarregado) a um encarregado', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.findUnique.mockResolvedValueOnce({
        ID_aluno: 1,
        ID_Enc_Educacao: null, // O aluno está livre
      });
      prismaMock.aluno.update.mockResolvedValue({
        ID_aluno: 1,
        ID_Enc_Educacao: 10,
      });

      await expect(service.associarEducando(10, 1)).resolves.toEqual({
        ID_aluno: 1,
        ID_Enc_Educacao: 10,
      });
    });

    it('deve rejeitar a associação de um educando se ele já pertencer a outro encarregado', async () => {
      prismaMock.enc_Educacao.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.aluno.findUnique.mockResolvedValueOnce({
        ID_aluno: 1,
        ID_Enc_Educacao: 99, // O aluno já tem encarregado
      });
      
      await expect(service.associarEducando(10, 1)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // BLOCO 5: Faturação (Apenas para Encarregados de Educação)
  // ---------------------------------------------------------------------------
  describe('Gestão de Faturação e Pagamentos', () => {
    it('deve devolver as faturas pendentes ou pagas referentes aos educandos de um encarregado', async () => {
      // Simula que o utilizador existe e recupera faturas pendentes do aluno
      prismaMock.utilizador.findUnique.mockResolvedValue({ ID_Pessoa: 10 });
      prismaMock.coaching_Aluno.findMany.mockResolvedValue([
        {
          Data_Inscricao: new Date('2026-05-01'),
          ValorEmFalta: 20, // Fatura não paga (20€ em falta)
          Observacoes: null,
          Aluno: { Nome: 'Aluno' },
          Coaching: { Disponibilidade: { Modalidade: 'Salsa' } },
        },
      ]);

      // Valida se o DTO é formatado corretamente e devolvido ao EE
      await expect(service.getFaturasEncarregado(1)).resolves.toEqual([
        expect.objectContaining({
          Descricao: 'Salsa - Aluno',
          Valor: 20,
          Pago: false,
        }),
      ]);
    });
  });
});