import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO usado para transportar os dados de Create Utilizador.
 */

export class CreateUtilizadorDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 'joao.silva' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'joao@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '912345678' })
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  nif?: string;

  @ApiProperty({
    example: '1995-10-07',
    description: 'Data de nascimento no formato YYYY-MM-DD',
  })
  @IsDateString()
  @IsNotEmpty()
  dataNascimento!: string;

  @ApiProperty({
    example: 'Professor',
    enum: ['Professor', 'Coordenador', 'Direção', 'Encarregado de Educação'],
  })
  @IsString()
  @IsNotEmpty()
  cargo!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
