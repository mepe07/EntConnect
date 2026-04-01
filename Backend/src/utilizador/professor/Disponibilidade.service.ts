import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDisponibilidadeDto } from '../dto/create-disponibilidade.dto';

@Injectable()
export class DispobilidadeService {

    constructor(private prisma: PrismaService) { }

    async createDisponibility(createDisponibilidadeDto: CreateDisponibilidadeDto) {
        // Implementar verificações

        const novaDispobilidade = await this.prisma.disponibilidade.create({
            data: {
                ID_Professor: createDisponibilidadeDto.ID_Professor,
                Dia_Semana: createDisponibilidadeDto.Dia_Semana,
                Hora_Inicio: createDisponibilidadeDto.Hora_Inicio,
                Hora_Fim: createDisponibilidadeDto.Hora_Fim,
                EstadoDisponibilidadeID: createDisponibilidadeDto.EstadoDisponibilidadeID,
                AlteradoPorUtilizadorID: createDisponibilidadeDto.AlteradoPorUtilizadorID,
                DataAtualizacao: new Date(),
            },
        });

        return {
            message: 'Disponibilidade criada com sucesso',
            disponibilidade: novaDispobilidade
        };
    }
}