import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class MarcacoesService {
    constructor(private readonly prisma: PrismaService) { }

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

        const registro = await this.prisma.coaching_Aluno.findFirst({
            where: {
                ID_Enc_Educacao: idEE,
                ID_Coaching: idCoaching,
            },
        });

        if (!registro) {
            throw new Error('Sessão de coaching não encontrada para este encarregado de educação.');
        }

        await this.prisma.coaching.update({
            where: { ID_Coaching: idCoaching },
            data: { ID_Estado_Coaching: idEstadoCoaching },
        });

        return {
            message: 'Estado de coaching atualizado com sucesso.',
        };
    }
}

