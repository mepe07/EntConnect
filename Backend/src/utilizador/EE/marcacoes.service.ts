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
                        Sala: true
                    }
                }
            }
        });
    }
}

