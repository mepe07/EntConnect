import { Injectable } from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from 'src/prisma/prisma.service';

// Serviço para lidar com operações simples CRUD relacionados com utilizadores.

@Injectable()
export class UtilizadorService {

  constructor(private prisma: PrismaService) {}

  async blockUser(id: number) {
    // Vai à tabela utilizador, procura pelo ID e atualiza o campo ativo para false
    return this.prisma.utilizador.update({
      where: {ID_Utilizador: id},
      data: {Ativo: false}
    })
  }

    async unlockUser(id: number) {
    // Vai à tabela utilizador, procura pelo ID e atualiza o campo ativo para true
    return this.prisma.utilizador.update({
      where: {ID_Utilizador: id},
      data: {Ativo: true}
    })
  }



  // create(createUtilizadorDto: CreateUtilizadorDto) {
  //   return 'This action adds a new utilizador';
  // }

  // findAll() {
  //   return `This action returns all utilizador`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} utilizador`;
  // }

  // update(id: number, updateUtilizadorDto: UpdateUtilizadorDto) {
  //   return `This action updates a #${id} utilizador`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} utilizador`;
  // }
}
