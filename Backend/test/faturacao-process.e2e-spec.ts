import { describe, beforeAll, afterEach, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FaturacaoService } from '../src/faturacao/faturacao.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('FaturacaoService (Testes de Integração)', () => {
  let faturacaoService: FaturacaoService;
  let prismaService: PrismaService;

  // Configura um mock global para o Prisma, garantindo que não toca na base de dados
  const mockPrismaService = {
    coaching_Aluno: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  // Cria uma função auxiliar para gerar faturas fictícias
  const criarFaturaFake = (override: Record<string, unknown> = {}) =>
    ({
      ID_Coaching: 1,
      ID_Aluno: 2,
      ValorEmFalta: 50, // Fatura padrão com 50€ em falta
      Aluno: {
        Nome: 'João M.',
        Enc_Educacao: {
          Pessoa: { Nome: 'Pai do João', Email: 'pai@test.pt', Contacto: '910000000' },
        },
      },
      Enc_Educacao: null,
      Coaching: {
        Inicio_Coaching: new Date('2026-06-01T10:00:00.000Z'),
        Duracao: 60,
        ValorPorAluno: 50,
        Professor: {
          Pessoa: { Nome: 'Prof. Silva', Email: 'silva@test.pt', Foto: 'foto.jpg' },
        },
        Sala: { Nome: 'Estúdio Principal' },
        Estado_Coaching: { Tipo: 'Realizada' },
      },
      ...override,
    }) as any;

  // Usa o beforeAll para inicializar o módulo de teste do NestJS, simulando o arranque da aplicação
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaturacaoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // Injeta o mock em vez do Prisma real
        },
      ],
    }).compile();

    // Obtém as instâncias dos serviços a partir do módulo compilado
    faturacaoService = module.get<FaturacaoService>(FaturacaoService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Limpa os mocks após cada teste para garantir que um teste não interfere com o seguinte
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fluxo Integrado: Consulta e Liquidação de Fatura', () => {
    it('deve conseguir consultar uma fatura em falta e depois registar o seu pagamento total', async () => {
      //Prepara o cenário: existe uma fatura de 50€ por pagar
      const faturaPendente = criarFaturaFake({ ValorEmFalta: 50 });
      
      // Simula o que a base de dados devolveria na consulta e na atualização
      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(faturaPendente);
      jest.spyOn(prismaService.coaching_Aluno, 'update').mockResolvedValue({
        ID_Coaching: 1,
        ID_Aluno: 2,
        ValorEmFalta: 0, // Indica que o valor em falta passou a zero após o update
      } as any);

      //Executa a ação: tenta registar o pagamento total (sem passar valor parcial)
      const resultadoPagamento = await faturacaoService.registarPagamento(1, 2);

      //Verifica se tudo correu como esperado na lógica de integração
      //Valida se o serviço chamou primeiro a base de dados para procurar a fatura
      expect(prismaService.coaching_Aluno.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ID_Coaching_ID_Aluno: { ID_Coaching: 1, ID_Aluno: 2 } } })
      );
      
      // Valida se o update foi chamado com o novo valor em falta (0)
      expect(prismaService.coaching_Aluno.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ID_Coaching_ID_Aluno: { ID_Coaching: 1, ID_Aluno: 2 } },
          data: { ValorEmFalta: 0 },
        })
      );

      //Garante que a resposta do serviço indica que o valor pago foi 50 e que já não há dívida
      expect(resultadoPagamento).toEqual(
        expect.objectContaining({
          valorPagoRegistado: 50,
          valorEmFalta: 0,
        })
      );
    });
  });

  describe('Fluxo Integrado: Tentativa de pagamento de uma fatura inexistente', () => {
    it('deve receber um erro NotFoundException ao tentar pagar algo que não existe no sistema', async () => {
      //Configura o mock para simular que a fatura não existe na base de dados
      jest.spyOn(prismaService.coaching_Aluno, 'findUnique').mockResolvedValue(null);

      //Executa a função, sabendo que ela vai rejeitar a promessa
      const tentativaDePagamento = faturacaoService.registarPagamento(99, 99);

      //Valida que o erro é exatamente o esperado e que o fluxo parou por aí
      await expect(tentativaDePagamento).rejects.toThrow(NotFoundException);
      
      //Certifica-se de que o serviço nunca tentou atualizar nada na base de dados após o erro
      expect(prismaService.coaching_Aluno.update).not.toHaveBeenCalled();
    });
  });

  describe('Fluxo Integrado: Geração de Dashboard de Gestão', () => {
    it('deve conseguir obter os dados financeiros consolidados de um determinado período', async () => {
      //Prepara o ambiente devolvendo duas faturas diferentes para o período consultado
      const fatura1 = criarFaturaFake({ 
        ValorEmFalta: 0, //Esta já foi totalmente paga (50€)
        Coaching: { ...criarFaturaFake().Coaching, ValorPorAluno: 50 }
      });
      const fatura2 = criarFaturaFake({ 
        ValorEmFalta: 20, //Esta custa 50€, mas ainda faltam 20€ (logo, já pagaram 30€)
        Coaching: { ...criarFaturaFake().Coaching, ValorPorAluno: 50 }
      });

      jest.spyOn(prismaService.coaching_Aluno, 'findMany').mockResolvedValue([fatura1, fatura2] as any);

      //Define as datas e pede os dados do dashboard financeiro ao serviço
      const dataInicio = new Date('2026-05-01');
      const dataFim = new Date('2026-05-31');
      const resultadoDashboard = await faturacaoService.getDashboardFinanceiro(dataInicio, dataFim);

      //Verifica se a agregação matemática feita pelo backend funcionou perfeitamente
      expect(prismaService.coaching_Aluno.findMany).toHaveBeenCalled();
      
      //Matemática esperada: 
      //Total em Dívida: 0 + 20 = 20€
      //Total Pago: (50-0) + (50-20) = 50 + 30 = 80€
      expect(resultadoDashboard.resumoGeral).toEqual({
        totalPago: 80,
        totalEmDivida: 20,
      });

      //Valida também se o agrupamento por professor está correto
      expect(resultadoDashboard.topProfessores).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nome: 'Prof. Silva',
            total: 80, //O professor gerou 80€ pagos no total
          })
        ])
      );
    });
  });
});