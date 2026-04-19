import { Injectable } from '@nestjs/common';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { PrismaService } from '../prisma/prisma.service'; // Importa o PrismaService para interagir com a DB

@Injectable()
export class CoachingService {

  constructor(private readonly prisma: PrismaService) {} // Injeta o PrismaService no construtor
  

  async create(createCoachingDto: CreateCoachingDto) {
    // Usa o Prisma para criar um novo registo de coaching na DB
    return this.prisma.coaching.create({
      data: createCoachingDto, // Os dados para criar o coaching vêm do DTO
    });
  }


  async inscreverAluno(idDisponibilidade: number, body: any) {
    
    let coaching = await this.prisma.coaching.findFirst({
      where: { ID_Disponibilidade: idDisponibilidade },
    });

    if (!coaching) {
      coaching = await this.prisma.coaching.create({
        data: {
          ID_Professor: body.idProfessor,
          ID_Estado_Coaching: body.idEstadoCoaching,
          ID_Sala: body.idSala,
          ID_Coordenador: body.idCoordenador,
          ValorPorAluno: body.valorPorAluno,
          Inicio_Coaching: new Date(body.inicio_Coaching), 
          Duracao: body.duracao,
          ID_Disponibilidade: idDisponibilidade, 
        },
      })
    }

    const novaInscricao = await this.prisma.coaching_Aluno.create({
      data: {
        ID_Coaching: coaching.ID_Coaching,
        ID_Aluno: body.idAluno,
        Observacoes: body.obs || null,
        Data_Inscricao: new Date(),
        ValorEmFalta: body.valorEmFalta,
        ID_Enc_Educacao: body.idEncEducacao,
      },
    });

    return {
      message: 'Aluno inscrito com sucesso!',
      inscricao: novaInscricao
    };
  
  }
}
