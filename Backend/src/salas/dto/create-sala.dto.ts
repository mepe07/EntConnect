import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO usado para criar uma sala.
 */
export class CreateSalaDto {
    @ApiProperty({ example: 'Sala Beethoven', description: 'O nome da sala' })
    @IsString({ message: 'O nome da sala tem de ser um texto.' })
    @IsNotEmpty({ message: 'O nome da sala não pode estar vazio.' })
    nome: string;

    @ApiProperty({ example: 1, description: 'O ID da modalidade associada à sala' })
    @IsNotEmpty({ message: 'Tem de associar uma modalidade a esta sala.' })
    modalidade: string | number;

    @ApiProperty({ example: true, description: 'Indica se a sala está pronta a ser usada' })
    @IsBoolean({ message: 'A disponibilidade tem de ser verdadeira (true) ou falsa (false).' })
    @IsOptional()
    disponivel: boolean;
}
