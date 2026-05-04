import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Upsert Educando.
 */

export class UpsertEducandoDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({
    example: '2012-04-15',
    description: 'Data de nascimento no formato YYYY-MM-DD',
  })
  @IsDateString()
  @IsNotEmpty()
  dataNascimento!: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  nif!: string;

  @ApiPropertyOptional({ example: 'maria.silva@example.com' })
  @IsOptional()
  @IsString()
  mail?: string;

  @ApiPropertyOptional({ example: '912345678' })
  @IsOptional()
  @IsString()
  contato?: string;
}
