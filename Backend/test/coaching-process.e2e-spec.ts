import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DispobilidadeService } from '../src/utilizador/professor/Disponibilidade.service'; 
import { CoachingService } from '../src/coaching/coaching.service';
import { MarcacoesService } from '../src/utilizador/EE/marcacoes.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jornada Completa de Coaching (Com Prisma Mockado)', () => {
    let dispService: DispobilidadeService;
    let coachingService: CoachingService;
    let marcacoesService: MarcacoesService;
    let prismaService: PrismaService;

    // 1. Criamos um super-mock com TODAS as tabelas e métodos que a jornada vai precisar
    const mockPrismaService = {
        disponibilidade: {
            create: jest.fn<() => Promise<any>>(),
            update: jest.fn<() => Promise<any>>(),
            count: jest.fn<() => Promise<any>>(),
            findUnique: jest.fn<() => Promise<any>>(),
        },
        coaching: {
            create: jest.fn<() => Promise<any>>(),
            update: jest.fn<() => Promise<any>>(),
            findFirst: jest.fn<() => Promise<any>>(),
            findUnique: jest.fn<() => Promise<any>>(),
        },
        coaching_Aluno: {
            create: jest.fn<() => Promise<any>>(),
            updateMany: jest.fn<() => Promise<any>>(),
            count: jest.fn<() => Promise<any>>(),
        },
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DispobilidadeService,
                CoachingService,
                MarcacoesService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        dispService = module.get<DispobilidadeService>(DispobilidadeService);
        coachingService = module.get<CoachingService>(CoachingService);
        marcacoesService = module.get<MarcacoesService>(MarcacoesService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    it('deve simular o fluxo: Criar Disp -> Aprovar -> Inscrever -> Confirmar EE -> Confirmar Prof', async () => {
        
        // ====================================================================
        // PASSO 1: Professor cria a disponibilidade
        // ====================================================================
        const idDisp = 1;
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);

        const dispDto = {
            ID_Professor: 1,
            Hora_Inicio: amanha.toISOString(),
            Duracao: 60,
            Modalidade: 'Presencial',
            MaxAlunos: 5,
        };

        // Ensinamos o prisma a devolver a disponibilidade criada
        mockPrismaService.disponibilidade.create.mockResolvedValue({
            ID_Disponibilidade: idDisp,
            MaxAlunos: 5,
        });

        const dispResult = await dispService.criarDisponibilidade(dispDto as any);
        expect(prismaService.disponibilidade.create).toHaveBeenCalledTimes(1);
        expect(dispResult.disponibilidade.MaxAlunos).toBe(5);


        // ====================================================================
        // PASSO 2: Coordenadora aprova (Define valor e estúdio)
        // ====================================================================
        const updateDto = { ValorPorAluno: 20, IdEstudio: 2 };

        // Ensinamos o prisma a dizer que a disponibilidade existe (count = 1) e a devolver a BD atualizada
        mockPrismaService.disponibilidade.count.mockResolvedValue(1);
        mockPrismaService.disponibilidade.update.mockResolvedValue({
            ID_Disponibilidade: idDisp,
            ValorPorAluno: 20,
            IdEstudio: 2,
        });

        const aprovacaoResult = await dispService.updateAvailability(idDisp, updateDto as any);
        expect(aprovacaoResult.disponibilidade.ValorPorAluno).toBe(20);


        // ====================================================================
        // PASSO 3: Encarregado de Educação inscreve um aluno
        // ====================================================================
        const inscricaoDto = { idAluno: 10, idEncEducacao: 4, inicio_Coaching: amanha.toISOString() };
        const idCoaching = 100;

        // Ensinamos o prisma a responder às 4 queries que o inscreverAluno faz:
        // 1. Tem vagas? Sim (5)
        mockPrismaService.disponibilidade.findUnique.mockResolvedValue({ MaxAlunos: 5 });
        // 2. Já existe sessão? Não (null)
        mockPrismaService.coaching.findFirst.mockResolvedValue(null);
        // 3. Cria a sessão de coaching
        mockPrismaService.coaching.create.mockResolvedValue({ ID_Coaching: idCoaching });
        // 4. Cria a inscrição do aluno
        mockPrismaService.coaching_Aluno.create.mockResolvedValue({ ID_Aluno: 10 });
        // 5. Desconta a vaga
        mockPrismaService.disponibilidade.update.mockResolvedValue({});

        const inscResult = await coachingService.inscreverAluno(idDisp, inscricaoDto as any);
        expect(prismaService.coaching.create).toHaveBeenCalledTimes(1);
        expect(inscResult.message).toBe('Aluno inscrito com sucesso!');


        // ====================================================================
        // PASSO 4: Encarregado de Educação confirma a sessão
        // ====================================================================
        const idEE = 4;
        const idEstadoConcluido = 13;

        // Ensinamos o prisma para o método confirmarSessaoByEE
        mockPrismaService.coaching_Aluno.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.coaching_Aluno.count.mockResolvedValue(0); // 0 alunos pendentes!
        mockPrismaService.coaching.findUnique.mockResolvedValue({
            ID_Estado_Coaching: 10,
            confirmacao_prof: false, // Professor ainda não confirmou
        });
        mockPrismaService.coaching.update.mockResolvedValue({});

        const confirmacaoEE = await marcacoesService.confirmarSessaoByEE(idEE, idCoaching, idEstadoConcluido);
        expect(confirmacaoEE.message).toBe('Confirmação do encarregado registada. A aguardar confirmação do professor.');


        // ====================================================================
        // PASSO 5: Professor confirma a sessão (Fecho final)
        // ====================================================================
        // Para o professor confirmar, a data tem de estar no passado
        const ontem = new Date();
        ontem.setHours(ontem.getHours() - 2);

        // Ensinamos o prisma a devolver a sessão no passado e com a confirmação do EE já a true (do passo 4)
        mockPrismaService.coaching.findUnique.mockResolvedValue({
            ID_Coaching: idCoaching,
            Inicio_Coaching: ontem,
            ID_Estado_Coaching: 10,
            confirmacao_EE: true, // EE já confirmou!
        });

        // Ensinamos o update a devolver o estado final
        mockPrismaService.coaching.update.mockResolvedValue({
            ID_Estado_Coaching: 13,
            confirmacao_prof: true,
            confirmacao_EE: true,
        });

        // NOTA: Se o teu método confirmarSessaoProfessor estiver no CoachingService em vez do Marcacoes, altera a chamada aqui!
        const confirmacaoProf = await coachingService.confirmarSessaoProfessor(idCoaching); 
        
        // VERIFICAÇÃO FINAL
        expect(confirmacaoProf.ID_Estado_Coaching).toBe(13); // A máquina de estados chegou ao fim!
        expect(confirmacaoProf.confirmacao_prof).toBe(true);
    });
});