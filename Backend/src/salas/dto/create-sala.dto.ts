// LÓGICA: O DTO dita as regras exatas do que viaja do React para o NestJS.
// Mais tarde, podemos adicionar aqui validadores como @IsString() ou @IsNotEmpty().

// IMPORTANTE: Importa o decorador do Swagger
import { ApiProperty } from '@nestjs/swagger';


export class CreateSalaDto {
  
    // LÓGICA: O @ApiProperty diz ao Swagger: "Este campo existe e tem este aspeto!"
    @ApiProperty({ example: 'Sala Beethoven', description: 'O nome da sala' })
    nome: string;

    @ApiProperty({ example: 'Música Clássica', description: 'A modalidade principal ensinada na sala' })
    modalidade: string;

    @ApiProperty({ example: true, description: 'Indica se a sala está pronta a ser usada' })
    disponivel: boolean;
}
