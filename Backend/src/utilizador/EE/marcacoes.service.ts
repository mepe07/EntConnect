import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
/**
 * Serviço responsável pelas marcações e confirmações do encarregado de educação.
 */
export class MarcacoesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista marcações associadas a um encarregado de educação.
     *
     * @param idEE - Identificador do encarregado de educação.
     * @returns Marcações registadas para o encarregado.
     */
    async getMarcacoesbyEE(idEE: number) {
        return this.prisma.coaching_Aluno.findMany({
            where: {
                ID_Enc_Educacao: idEE
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true
                            }
                        },
                        Disponibilidade: {
                            select: {
                                Modalidade: true
                            }
                        },
                        Estado_Coaching: true,
                        Sala: true
                    }
                }
            }
        });
    }

    async getConfirmacoesByEE(idEE: number) {
        const now = new Date();

        const registros = await this.prisma.coaching_Aluno.findMany({
            where: {
                ID_Enc_Educacao: idEE,
                confirmado: false,
                Coaching: {
                    Inicio_Coaching: {
                        lt: now,
                    },
                    ID_Estado_Coaching: 7,
                },
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true,
                            },
                        },
                        Disponibilidade: true,
                        Estado_Coaching: true,
                        Coaching_Aluno: {
                            include: {
                                Aluno: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                Data_Inscricao: 'desc',
            },
        });

        const sessionsMap = new Map<number, any>();

        for (const registro of registros) {
            const coaching = registro.Coaching;
            if (!coaching) continue;

            const data = coaching.Inicio_Coaching ? coaching.Inicio_Coaching.toLocaleDateString('pt-PT') : 'N/A';
            const horario = coaching.Inicio_Coaching && coaching.Duracao
                ? `${coaching.Inicio_Coaching.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${(new Date(coaching.Inicio_Coaching.getTime() + coaching.Duracao * 60000)).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                : 'N/A';

            const session = sessionsMap.get(coaching.ID_Coaching) ?? {
                idCoaching: coaching.ID_Coaching,
                data,
                horario,
                modalidade: coaching.Disponibilidade?.Modalidade || 'N/A',
                estado: coaching.Estado_Coaching?.Tipo || 'N/A',
                professor: coaching.Professor?.Pessoa?.Nome || 'N/A',
                alunos: [] as Array<{ idAluno: number; nome: string }>,
            };

            if (!sessionsMap.has(coaching.ID_Coaching)) {
                sessionsMap.set(coaching.ID_Coaching, session);
            }

            session.alunos.push({
                idAluno: registro.ID_Aluno,
                nome: registro.Aluno?.Nome || 'N/A',
            });
        }

        return Array.from(sessionsMap.values());
    }

    async confirmarSessaoByEE(idEE: number, idCoaching: number, idEstadoCoaching: number) {
        if (![13, 14].includes(idEstadoCoaching)) {
            throw new Error('ID de estado de coaching inválido.');
        }

        // 1. Atualizar a coluna "confirmado" para os alunos deste EE nesta sessão específica
        // Usamos updateMany porque um EE pode ter mais do que um educando na mesma sessão
        await this.prisma.coaching_Aluno.updateMany({
            where: {
                ID_Enc_Educacao: idEE,
                ID_Coaching: idCoaching,
            },
            data: {
                confirmado: true,
            },
        });

        // 2. Verificar se ainda existem outros alunos na mesma sessão que NÃO confirmaram
        const pendentes = await this.prisma.coaching_Aluno.count({
            where: {
                ID_Coaching: idCoaching,
                confirmado: false,
            },
        });

        // 3. Se não houver mais pendentes (count === 0), finalizamos a sessão na tabela Coaching
        if (pendentes === 0) {
            await this.prisma.coaching.update({
                where: { ID_Coaching: idCoaching },
                data: {
                    ID_Estado_Coaching: idEstadoCoaching,
                    confirmacao_EE: true // Coloca a confirmação global do EE a 1
                },
            });
        }

        return {
            message: pendentes === 0
                ? 'Sessão finalizada com sucesso (todos os alunos confirmaram).'
                : 'Confirmação registada. A aguardar confirmação dos restantes alunos.',
        };
    }

    // // async confirmarSessaoByEE(idEE: number, idCoaching: number, idEstadoCoaching: number) {
    // //     if (![13, 14].includes(idEstadoCoaching)) {
    // //         throw new Error('ID de estado de coaching inválido.');
    // //     }

    // //     const registro = await this.prisma.coaching_Aluno.findFirst({
    // //         where: {
    // //             ID_Enc_Educacao: idEE,
    // //             ID_Coaching: idCoaching,
    // //         },
    // //     });

    // //     if (!registro) {
    // //         throw new Error('Sessão de coaching não encontrada para este encarregado de educação.');
    // //     }

    // //     await this.prisma.coaching.update({
    // //         where: { ID_Coaching: idCoaching },
    // //         data: { ID_Estado_Coaching: idEstadoCoaching },
    // //     });

    // //     return {
    // //         message: 'Estado de coaching atualizado com sucesso.',
    // //     };
    // // }
}

