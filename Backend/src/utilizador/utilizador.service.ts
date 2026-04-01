import { Injectable } from '@nestjs/common';
import { CreateUtilizadorDto } from './dto/create-utilizador.dto';
import { UpdateUtilizadorDto } from './dto/update-utilizador.dto';
import { PrismaService } from 'src/prisma/prisma.service';

// Serviço para lidar com operações simples CRUD relacionados com utilizadores.

@Injectable()
export class UtilizadorService {

  constructor(private prisma: PrismaService) {}

  // WIP
  async getAllUsers() {
    const utilizadoresRaw = await this.prisma.utilizador.findMany({
      include: {
        Pessoa: {
          include: {
            Professor: true,
            Coordenador: true,
            Direcao: true,
            Enc_Educacao: true
          }
        }
      }
    });

    // Em vez de enviar objetos cheios de "nulls" para o Frontend, 
    // mapear e criar um array de "cargos" limpo.
    return utilizadoresRaw.map((user) => {
      
      // Detetar quais os papéis desta pessoa no sistema
      const cargos: string[] = [];
      if (user.Pessoa?.Professor) cargos.push('Professor');
      if (user.Pessoa?.Coordenador) cargos.push('Coordenador');
      if (user.Pessoa?.Direcao) cargos.push('Direção');
      if (user.Pessoa?.Enc_Educacao) cargos.push('Encarregado de Educação');

      // Construir o objeto final elegante e seguro (sem enviar a Password!)
      return {
        idUtilizador: user.ID_Utilizador,
        username: user.Utilizador,
        ativo: user.Ativo,
        nome: user.Pessoa?.Nome,
        email: user.Pessoa?.Email,
        contacto: user.Pessoa?.Contacto,
        nif: user.Pessoa?.NIF,
        cargos: cargos, // Ex: ['Professor']
      };
    });
  }

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
