import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePedidoCoachingDto {
  @ApiPropertyOptional({ example: 12, description: 'ID_Pessoa do encarregado, usado quando o professor propõe.' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idEncEducacao?: number;

  @ApiPropertyOptional({ example: 8, description: 'ID_Pessoa do professor, usado quando o EE propõe.' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idProfessor?: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  idModalidade!: number;

  @ApiProperty({ example: '2026-06-10T15:30:00.000Z' })
  @IsISO8601()
  inicio!: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @IsPositive()
  duracaoMinutos!: number;

  @ApiProperty({ example: [21, 34] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  alunosIds!: number[];

  @ApiPropertyOptional({ example: 'Preferência por trabalho técnico.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mensagem?: string;
}
