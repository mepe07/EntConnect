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

  // async findAll() {
  //   // Usa o Prisma para ir buscar todos os registos de coaching na DB
  //   return this.prisma.coaching.findMany();
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} coaching`;
  // }

  // update(id: number, updateCoachingDto: UpdateCoachingDto) {
  //   return `This action updates a #${id} coaching`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} coaching`;
  // }
}
