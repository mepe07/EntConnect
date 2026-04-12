// LÓGICA: O DTO dita as regras exatas do que viaja do React para o NestJS.
// Mais tarde, podemos adicionar aqui validadores como @IsString() ou @IsNotEmpty().

// IMPORTANTE: Importa o decorador do Swagger
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';


export class CreateSalaDto {
  
    @ApiProperty({ example: 'Sala Beethoven', description: 'O nome da sala' })
    @IsString({ message: 'O nome da sala tem de ser um texto.' })
    @IsNotEmpty({ message: 'O nome da sala não pode estar vazio.' })
    nome: string;

    // A modalidade vem do <select> do React, logo vem como ID (número ou string)
    @ApiProperty({ example: 1, description: 'O ID da modalidade associada à sala' })
    @IsNotEmpty({ message: 'Tem de associar uma modalidade a esta sala.' })
    modalidade: string | number; 

    @ApiProperty({ example: true, description: 'Indica se a sala está pronta a ser usada' })
    @IsBoolean({ message: 'A disponibilidade tem de ser verdadeira (true) ou falsa (false).' })
    @IsOptional() 
    disponivel: boolean;
}
