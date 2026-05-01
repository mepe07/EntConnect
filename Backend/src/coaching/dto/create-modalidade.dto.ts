import { ApiProperty as ApiPropertyOptional, ApiPropertyOptional as ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from 'class-validator'; // <-- Importa os validadores

export class CreateModalidadeDto {
  

  
 @ApiProperty({ example: 'Hip-Hop', description: 'Descrição da modalidade' })
  @IsString() // Diz ao NestJS que este campo tem de ser uma string
  @IsNotEmpty() // Diz que o campo não pode ser enviado em branco
  Descricao!: string;
}