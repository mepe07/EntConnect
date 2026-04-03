import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalasService {

    // Injetamos o Prisma no construtor. 
    // Agora o nosso "Cozinheiro" tem acesso direto à base de dados SQL Server!
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // CREATE (Criar uma nova sala)
    // ==========================================
    async create(createSalaDto: any) {
        // LÓGICA DE SÉNIOR: Pedimos ao Prisma para criar, mas também para INCLUIR a Modalidade 
        // logo a seguir, para termos acesso ao texto descritivo da mesma!
        const novaSala = await this.prisma.sala.create({
            data: {
                Nome: createSalaDto.nome,
                // Garantimos que o booleano vai certinho para o SQL Server, precavendo 
                // caso o Frontend envie uma string "true" em vez do tipo booleano puro
                Disponivel: createSalaDto.disponivel === true || createSalaDto.disponivel === 'true',
                ID_Modalidade: parseInt(createSalaDto.modalidade) || null
            },
            include: {
                Modalidade: true // Magia do Prisma: Traz logo os dados da tabela Modalidade ligada!
            }
        });

        // O SEGREDO ESTÁ AQUI: Formatamos a resposta EXATAMENTE com a mesma estrutura do findAll!
        // Assim o React recebe a "novaSalaDaBD" perfeitamente pronta para entrar na tabela do ecrã.
        return {
            ID_Sala: novaSala.ID_Sala,
            Nome: novaSala.Nome,
            Disponivel: novaSala.Disponivel,
            // Se a sala tiver uma modalidade associada, vamos buscar o "Descri__o" lá dentro. 
            // Se não, enviamos 'Sem Modalidade'
            Modalidade: novaSala.Modalidade ? novaSala.Modalidade.Descricao : 'Sem Modalidade'
        };
    }

    // ==========================================
    // READ (Buscar todas as salas)
    // ==========================================
    async findAll() {
        // 1. Vamos buscar as salas ao SQL Server e pedimos para INCLUIR os dados da tabela Modalidade
        const salasDaBD = await this.prisma.sala.findMany({
            orderBy: { ID_Sala: 'asc' },
            include: {
                Modalidade: true // Faz um JOIN automático com a tabela Modalidade!
            }
        });

        // 2. Formatamos os dados EXATAMENTE para a interface que o teu React (Frontend) está à espera
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

    // ==========================================
    // UPDATE (Atualizar uma sala)
    // ==========================================
    async update(id: number, updateSalaDto: any) {
        // LÓGICA DE SÉNIOR: O Prisma precisa do 'where' para saber que linha alterar,
        // e do 'data' para saber o que escrever por cima dos dados velhos.
        const salaAtualizada = await this.prisma.sala.update({
            where: { ID_Sala: id },
            data: {
                Nome: updateSalaDto.nome,
                Disponivel: updateSalaDto.disponivel === true || updateSalaDto.disponivel === 'true',
                ID_Modalidade: parseInt(updateSalaDto.modalidade) || null
            },
            include: {
                Modalidade: true // Fazemos o include aqui também para manter a consistência!
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