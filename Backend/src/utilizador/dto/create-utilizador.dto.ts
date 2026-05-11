import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsNumberString,
  Length,
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

  @ApiProperty({ example: '123456789' })
  @IsString()
  @Length(9, 9, { message: 'O NIF deve ter exatamente 9 dígitos' })
  @IsNumberString({}, { message: 'O NIF deve conter apenas números' })
  nif!: string;

  @ApiProperty({
    example: '1995-10-07',
    description: 'Data de nascimento no formato YYYY-MM-DD',
  })
  @IsDateString()
  @IsNotEmpty()
  dataNascimento!: string;

  @ApiProperty({
    example: 'Professor',
    enum: [
      'Professor',
      'Coordenador',
      'Encarregado de Educa\u00e7\u00e3o',
    ],
  })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({
    example: ['Professor', 'Coordenador'],
    enum: [
      'Professor',
      'Coordenador',
      'Encarregado de Educa\u00e7\u00e3o',
    ],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  cargos?: string[];

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
