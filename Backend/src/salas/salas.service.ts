import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaDto } from './dto/create-sala.dto';

@Injectable()
/**
 * Serviço responsável pela gestão de salas e respetiva modalidade associada.
 */
export class SalasService {

    constructor(private prisma: PrismaService) { }

    /**
     * Cria uma nova sala.
     *
     * @param createSalaDto - Dados da sala.
     * @returns Sala criada e formatada para o frontend.
     */
    async create(createSalaDto: CreateSalaDto) { 
        const novaSala = await this.prisma.sala.create({
            data: {
                Nome: createSalaDto.nome,
                Disponivel: createSalaDto.disponivel === true,
                ID_Modalidade: parseInt(createSalaDto.modalidade as string) || null
            },
            include: {
            Modalidade: true 
            }
        });
        
        return {
            ID_Sala: novaSala.ID_Sala,
            Nome: novaSala.Nome,
            Disponivel: novaSala.Disponivel,
            Modalidade: novaSala.Modalidade ? novaSala.Modalidade.Descricao : 'Sem Modalidade'
        };
    }

    /**
     * Lista todas as salas.
     *
     * @returns Salas formatadas para consumo no frontend.
     */
    async findAll() {
        const salasDaBD = await this.prisma.sala.findMany({
            orderBy: { ID_Sala: 'asc' },
            include: {
                Modalidade: true
            }
        });

        return salasDaBD.map(sala => ({
            ID_Sala: sala.ID_Sala,
            Nome: sala.Nome,
            Disponivel: sala.Disponivel,
            Modalidade: sala.Modalidade ? sala.Modalidade.Descricao : 'Sem Modalidade'
        }));
    }

    findOne(id: number) {
        return `This action returns a #${id} sala`;
    }

    /**
     * Atualiza uma sala existente.
     *
     * @param id - Identificador da sala.
     * @param updateSalaDto - Dados atualizados da sala.
     * @returns Sala atualizada.
     */
    async update(id: number, updateSalaDto: any) {
        const salaAtualizada = await this.prisma.sala.update({
            where: { ID_Sala: id },
            data: {
                Nome: updateSalaDto.nome,
                Disponivel: updateSalaDto.disponivel === true || updateSalaDto.disponivel === 'true',
                ID_Modalidade: parseInt(updateSalaDto.modalidade) || null
            },
            include: {
                Modalidade: true
            }
        });

        // Mantemos a consistência do prato servido ao cliente
        return {
            ID_Sala: salaAtualizada.ID_Sala,
            Nome: salaAtualizada.Nome,
            Disponivel: salaAtualizada.Disponivel,
            Modalidade: salaAtualizada.Modalidade ? salaAtualizada.Modalidade.Descricao : 'Sem Modalidade'
        };
    }

    // ==========================================
    // DELETE (Remover uma sala)
    // ==========================================
    async remove(id: number) {
        try {
            return await this.prisma.sala.delete({
                where: { ID_Sala: id },
            });
        } catch (error) {
            // LÓGICA DE SÉNIOR: Se o erro for do Prisma e for o P2003 (Foreign Key)...
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                // ... atiramos um erro HTTP 409 (Conflict) com uma mensagem em português!
                throw new HttpException(
                    'Não é possível apagar esta sala porque tem sessões de Coaching associadas.', 
                    HttpStatus.CONFLICT
                );
            }
      
            // Se for outro erro qualquer, deixamos passar
            throw error;
        }
    }
} 
