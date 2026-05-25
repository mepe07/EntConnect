import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Create Disponibilidade.
 */

export class CreateDisponibilidadeDto {
  @ApiProperty({ example: 1, description: 'ID do Professor' })
  @IsNotEmpty()
  @IsInt()
  ID_Professor: number;

  @ApiProperty({
    example: 1,
    description: 'ID do Utilizador que está a criar/alterar',
  })
  @IsNotEmpty()
  @IsInt()
  AlteradoPorUtilizadorID: number;

  @ApiProperty({
    example: '2026-05-10T09:00:00Z',
    description: 'Hora de início',
  })
  @IsNotEmpty()
  @IsDateString()
  Hora_Inicio: string;

  @ApiProperty({
    example: 60,
    description: 'Duração da disponibilidade em minutos',
  })
  @IsNotEmpty()
  @IsInt()
  Duracao: number;

  @ApiProperty({
    example: 4,
    description: 'Número máximo de alunos permitidos',
  })
  @IsNotEmpty()
  @IsInt()
  MaxAlunos: number;

  @ApiProperty({
    example: 'Ballet',
    description: 'Modalidade da disponibilidade',
  })
  @IsNotEmpty()
  @IsString()
  Modalidade: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Dia da semana para disponibilidades recorrentes',
  })
  @IsOptional()
  @IsInt()
  Dia_Semana?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se a disponibilidade recorrente esta ativa',
  })
  @IsOptional()
  @IsBoolean()
  Ativa?: boolean;
}
