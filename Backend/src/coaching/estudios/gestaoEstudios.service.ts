import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCoachingDto } from '../dto/create-coaching.dto';
import { UpdateCoachingDto } from '../dto/update-coaching.dto';
import { PrismaService } from '../../prisma/prisma.service'; // Importa o PrismaService para interagir com a DB

@Injectable()
export class GestaoEstudiosService {
    constructor(private readonly prisma: PrismaService) {} // Injeta o PrismaService no construtor
    
    /**
    * Obtém a lista completa de todos os estúdios/salas registados na base de dados.
    * Não aplica filtros de disponibilidade, retornando tanto as salas ativas como as bloqueadas.
    *
    * @returns {Promise<any[]>} Um array contendo todos os objetos das salas.
    */
    async getAllStudios() {
        return this.prisma.sala.findMany();
    }

    /**
   * Bloqueia um estúdio específico, impedindo que seja reservado para novas sessões.
   * * Este método executa duas validações de segurança antes de alterar a base de dados:
   * 1. Verifica se o ID fornecido corresponde a uma sala existente.
   * 2. Verifica se a sala já se encontra no estado bloqueado.
   * Só após estas validações é que o Prisma atualiza o campo `Disponivel` para `false`.
   *
   * @param {number} studioId - O identificador único (ID) numérico do estúdio a bloquear.
   * @returns {Promise<{message: string, studio: any}>} Retorna um objeto com a mensagem de sucesso e os dados do estúdio atualizado.
   * @throws {NotFoundException} Lançada quando o `studioId` não existe na base de dados.
   * @throws {BadRequestException} Lançada quando o estúdio já tem o campo `Disponivel` a `false`.
   */
    async lockStudio(studioId: number) {
        // Procurar o estudio na DB
        const studio = await this.prisma.sala.findUnique({
            where: { ID_Sala: studioId },
        });

        // Retorna erro se o estudio não existir
        if (!studio) {
            throw new NotFoundException(`Estúdio com ID ${studioId} não encontrado.`);
        }

        // Verificar se já está bloqueado
        if (studio.Disponivel === false) {
            // Erro 400 - Bad Request
            throw new BadRequestException(`Estúdio com ID ${studioId} já está bloqueado.`);
        }

        // Bloquear o estudio (Disponivel = false)
        const updatedStudio = await this.prisma.sala.update({
            where: { ID_Sala: studioId },
            data: { Disponivel: false },
        });

        return {
            message: `Estúdio '${studio.Nome}' bloqueado com sucesso.`,
            // Retorna o estudio atualizado para mostrar o novo estado
            studio: updatedStudio,
        };
    }

    /**
   * Desbloqueia um estúdio específico, permitindo que seja reservado para novas sessões.
   * * Este método executa duas validações de segurança antes de alterar a base de dados:
   * 1. Verifica se o ID fornecido corresponde a uma sala existente.
   * 2. Verifica se a sala já se encontra no estado desbloqueado.
   * Só após estas validações é que o Prisma atualiza o campo `Disponivel` para `true`.
   *
   * @param {number} studioId - O identificador único (ID) numérico do estúdio a desbloquear.
   * @returns {Promise<{message: string, studio: any}>} Retorna um objeto com a mensagem de sucesso e os dados do estúdio atualizado.
   * @throws {NotFoundException} Lançada quando o `studioId` não existe na base de dados.
   * @throws {BadRequestException} Lançada quando o estúdio já tem o campo `Disponivel` a `true`.
   */
    async unlockStudio(studioId: number) {
        // Procurar o estudio na DB
        const studio = await this.prisma.sala.findUnique({
            where: {ID_Sala: studioId}
        });

        // Retorna erro se o estudio não existir
        if (!studio) {
            throw new NotFoundException(`Estúdio com ID ${studioId} não encontrado.`);
        }

        // Verificar se já está desbloqueado
        if (studio.Disponivel === true) {
            // Erro 400 - Bad Request
            throw new BadRequestException(`Estúdio com ID ${studioId} já está desbloqueado.`);
        }

        // Desbloquear o estudio (Disponivel = true)
        const updatedStudio = await this.prisma.sala.update({
            where: {ID_Sala: studioId},
            data: {Disponivel: true}
        })

        return {
            message: `Estúdio '${studio.Nome}' desbloqueado com sucesso.`,
            studio: updatedStudio
        }
    }
}

