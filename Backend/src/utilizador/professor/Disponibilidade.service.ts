import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisponibilidadeDto } from '../dto/create-disponibilidade.dto';
import { UpdateDisponibilidadeDto } from '../dto/update-disponibilidade.dto';

@Injectable()
export class DispobilidadeService {

    constructor(private prisma: PrismaService) { }

    async createAvailability(idProfessor: number, createDisponibilidadeDto: CreateDisponibilidadeDto) {
        // Implementar verificações

        const novaDispobilidade = await this.prisma.disponibilidade.create({
            data: {
                ID_Professor: idProfessor, // Vem na rota como parâmetro
                Dia_Semana: createDisponibilidadeDto.Dia_Semana,
                Hora_Inicio: createDisponibilidadeDto.Hora_Inicio,
                Duracao: createDisponibilidadeDto.Duracao,
                EstadoDisponibilidadeID: 2, // Sempre criado como pendente
                AlteradoPorUtilizadorID: createDisponibilidadeDto.AlteradoPorUtilizadorID,
                DataAtualizacao: new Date(), // Data atual
            },
        });

        return {
            message: 'Disponibilidade criada com sucesso',
            disponibilidade: novaDispobilidade
        };
    }


    async updateAvailability(idDisponibilidade: number, updateDisponibilidadeDto: UpdateDisponibilidadeDto) {
        // Verificar a disponibilidade existe
        if (await this.prisma.disponibilidade.count({
            where: {ID_Disponibilidade: idDisponibilidade}
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