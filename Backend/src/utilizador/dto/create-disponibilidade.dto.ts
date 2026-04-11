import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateDisponibilidadeDto {
  
  @ApiProperty({ example: 'Segunda-feira', description: 'Dia da semana' })
  @IsNotEmpty()
  @IsString()
  Dia_Semana: string;

  // Usamos IsDateString porque o Frontend envia datas/horas em formato de texto (ISO)
  @ApiProperty({ example: '2024-05-10T09:00:00Z', description: 'Hora de início' })
  @IsNotEmpty() 
  @IsDateString()
  Hora_Inicio: string;

  @ApiProperty({ 
    example: 60, 
    description: 'Duração da disponibilidade em minutos' 
  })
  @IsNotEmpty() // Adiciona também aqui por segurança, já que é obrigatório na BD!
  @IsNumber()
  Duracao: number;

  @ApiProperty({ example: 1, description: 'ID do Utilizador que está a criar/alterar' })
  @IsNotEmpty()
  @IsNumber()
  AlteradoPorUtilizadorID: number;

  @ApiProperty({ 
    example: 'Salsa',
    description: 'Modalidade da disponibilidade' 
  })
  @IsNotEmpty()
  @IsString()
  Modalidade: string;
}