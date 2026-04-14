import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsInt } from 'class-validator';

export class CreateDisponibilidadeDto {
  
  @ApiPropertyOptional({ example: 1, description: 'ID do Professor' })
  @IsOptional()
  @IsInt()
  ID_Professor?: number;

  @ApiPropertyOptional({ example: '2026-05-10T09:00:00Z', description: 'Hora de início' })
  @IsOptional() 
  @IsDateString()
  Hora_Inicio?: string;

  @ApiProperty({ example: 1, description: 'ID do Estado da Disponibilidade (ex: 1 para Pendente)' })
  @IsNotEmpty()
  @IsInt()
  EstadoDisponibilidadeID: number;

  @ApiProperty({ example: 1, description: 'ID do Utilizador que está a criar/alterar' })
  @IsNotEmpty()
  @IsInt()
  AlteradoPorUtilizadorID: number;

  @ApiProperty({ example: 60, description: 'Duração da disponibilidade em minutos' })
  @IsNotEmpty()
  @IsInt()
  Duracao: number;

  @ApiProperty({ example: 'Ballet', description: 'Modalidade da disponibilidade' })
  @IsNotEmpty()
  @IsString()
  Modalidade: string;

  @ApiPropertyOptional({ example: 3, description: 'ID do Estúdio atribuído' })
  @IsOptional()
  @IsInt()
  IdEstudio?: number;

  @ApiPropertyOptional({ example: 25, description: 'Valor cobrado por aluno' })
  @IsOptional()
  @IsNumber()
  ValorPorAluno?: number;

  @ApiPropertyOptional({ example: 4, description: 'Número máximo de alunos permitidos' })
  @IsOptional()
  @IsInt()
  MaxAlunos?: number;
}