import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisponibilidadeDto } from '../dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from '../dto/update-disponibilidade.dto';
@Injectable()
export class DispobilidadeService {

    constructor(private prisma: PrismaService) { }

    /**
     * Obtém a lista de disponibilidades dos professores.
     * @returns A lista de disponibilidades dos professores.
     */
    async getAvailabilities() {
        // 1. Ir buscar os dados crus com os JOINs necessários
        const disponibilidadesRaw = await this.prisma.disponibilidade.findMany({
            include: {
                Professor: { include: { Pessoa: true } },
                Estado_Disponibilidade: true,
                Utilizador: { include: { Pessoa: true } },

                // Vai buscar as sessões de coaching desta disponibilidade e os seus alunos
                Coaching: {
                    include: {
                        Coaching_Aluno: {
                            select: { ID_Aluno: true }
                        }
                    }
                }
            }
        });

        // 2. Mapear (traduzir) para o contrato que o Frontend espera
        return disponibilidadesRaw.map(disp => {

            // Lógica para formatar o horário (Ex: "09:00 - 10:00")
            // Assumindo que a Hora_Inicio vem como DateTime e Duracao em minutos
            if (disp.Hora_Inicio === null || disp.Duracao === null) {
                return null;
            }

            const horaInicio = new Date(disp.Hora_Inicio);
            const horaFim = new Date(horaInicio.getTime() + disp.Duracao * 60000);

            const formatHora = (data: Date) => data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const stringHorario = `${formatHora(horaInicio)} - ${formatHora(horaFim)}`;

            const strindData = horaInicio.toLocaleDateString('pt-PT');

            const alunosJaInscritos = disp.Coaching.flatMap(
                coaching => coaching.Coaching_Aluno.map(ca => ca.ID_Aluno)
            );

            // Return para o Frontend
            return {
                idDisponibilidade: disp.ID_Disponibilidade,
                nomeProfessor: disp.Professor?.Pessoa?.Nome || 'Professor Desconhecido',
                data: strindData,
                horario: stringHorario,
                modalidade: disp.Modalidade,
                alteradoPor: disp.Utilizador?.Pessoa?.Nome || 'Sistema',
                estado: disp.Estado_Disponibilidade?.Tipo || 'Desconhecido',
                duracao: disp.Duracao,
                maxAlunos: disp.MaxAlunos,
                idProfessor: disp.ID_Professor,
                idEstudio: disp.IdEstudio,
                valorPorAluno: disp.ValorPorAluno ? Number(disp.ValorPorAluno) : 0,
                idCoordenador: disp.AlteradoPorUtilizadorID,
                alunosInscritosIds: alunosJaInscritos
            };
        }).filter(item => item !== null);
    }


    async criarDisponibilidade(dto: CreateDisponibilidadeDto) {
        const horaInicio = new Date(dto.Hora_Inicio);
        const inicioDoDiaAtual = new Date();
        inicioDoDiaAtual.setHours(0, 0, 0, 0);

        const diaDisponibilidade = new Date(horaInicio);
        diaDisponibilidade.setHours(0, 0, 0, 0);

        if (diaDisponibilidade < inicioDoDiaAtual) {
            throw new BadRequestException('Nao e possivel criar disponibilidades com data anterior a data atual.');
        }

        const novaDisponibilidade = await this.prisma.disponibilidade.create({
            data: {
                ID_Professor: dto.ID_Professor,
                Hora_Inicio: horaInicio,
                EstadoDisponibilidadeID: 2,           // Sempre criado com o valor 2
                DataAtualizacao: new Date(),          // Data do momento exato da criação
                AlteradoPorUtilizadorID: dto.AlteradoPorUtilizadorID,
                Duracao: dto.Duracao,
                Modalidade: dto.Modalidade,           // Da view
                IdEstudio: null,                      // Sempre nulo na criação
                MaxAlunos: dto.MaxAlunos,             // Da view
                ValorPorAluno: null                   // Sempre nulo na criação
            }
        });

        return {
            message: 'Disponibilidade criada com sucesso!',
            disponibilidade: novaDisponibilidade
        };
    }



    async updateAvailability(idDisponibilidade: number, updateDisponibilidadeDto: UpdateDisponibilidadeDto) {
    // Verificar a disponibilidade existe
    if (await this.prisma.disponibilidade.count({
        where: { ID_Disponibilidade: idDisponibilidade }
    }) === 0) {
        throw new BadRequestException(`A disponibilidade com ID ${idDisponibilidade} não existe.`);
    }

    const atualizaDisponibilidade = await this.prisma.disponibilidade.update({
        where: {
            ID_Disponibilidade: idDisponibilidade
        },

        data: {
            ...updateDisponibilidadeDto, // todos os campos (vai ignorar os campos que não vierem no payload)
            DataAtualizacao: new Date(), // alterar data de atualição
        }
    });

    return {
        message: 'Disponibiliade atualizada com sucesso.',
        disponibilidade: atualizaDisponibilidade,
    };
}
}
