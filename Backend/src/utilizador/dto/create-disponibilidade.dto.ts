import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateDisponibilidadeDto {
  @ApiProperty({ example: 1, description: 'ID do Professor' })
  @IsNotEmpty()
  @IsNumber()
  ID_Professor: number;

  @ApiProperty({ example: 'Segunda-feira', description: 'Dia da semana' })
  @IsNotEmpty()
  @IsString()
  Dia_Semana: string;

  // Usamos IsDateString porque o Frontend envia datas/horas em formato de texto (ISO)

  @ApiProperty({ example: '2024-05-10T09:00:00Z', description: 'Hora de início' })
  @IsNotEmpty() // Substitui o IsOptional por IsNotEmpty!
  @IsDateString()
  Hora_Inicio: string;

  @ApiProperty({ example: '2024-05-10T13:00:00Z', description: 'Hora de fim' })
  @IsNotEmpty() // Aqui também!
  @IsDateString()
  Hora_Fim: string;

  @ApiProperty({ example: 1, description: 'ID do Estado da Disponibilidade' })
  @IsNotEmpty() // E aqui também!
  @IsNumber()
  EstadoDisponibilidadeID: number;

  @ApiProperty({ example: 1, description: 'ID do Utilizador que está a criar/alterar' })
  @IsNotEmpty()
  @IsNumber()
  AlteradoPorUtilizadorID: number;
}