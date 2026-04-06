import { ApiProperty as ApiPropertyOptional, ApiPropertyOptional as ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from 'class-validator'; // <-- Importa os validadores

export class CreateModalidadeDto {
  
  // @ApiProperty({ 
  //   description: "Cria uma nova modalidade"
  //  })

  // Todos os campos abaixo são opcionais (por causa do '?' no Prisma)

 // @ApiPropertyOptional({ example: 1, description: "ID da Modalidade" })
 // ID_Modalidade: number;
  
 @ApiProperty({ example: 'Hip-Hop', description: 'Descrição da modalidade' })
  @IsString() // Diz ao NestJS que este campo tem de ser uma string
  @IsNotEmpty() // Diz que o campo não pode ser enviado em branco
  Descricao!: string;
  /*
  @ApiPropertyOptional({ example: 1, description: "Horário de uma aula fixa" })
  Aula_Fixa?: number;

  @ApiPropertyOptional({ example: 1, description: "ID do pedido do coaching" })
  Pedido_Coaching?: number;

  @ApiPropertyOptional({ example: 1, description: "ID da sala" })
  Sala?: number;
  */
}