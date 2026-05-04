import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsNumberString,
  Length,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Create Professor.
 */

export class CreateProfessorDto {
  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do professor',
  })
  @IsString()
  @IsNotEmpty()
  Nome!: string;

  @ApiProperty({
    example: 'joao.silva@escola.pt',
    description: 'Email do professor',
  })
  @IsEmail()
  @IsNotEmpty()
  Email!: string;

  @ApiProperty({
    example: '1985-05-20',
    description: 'Data de nascimento (Formato ISO)',
  })
  @IsDateString()
  @IsNotEmpty()
  Data_Nascimento!: string;

  @ApiProperty({
    example: '123456789',
    description: 'Número de Identificação Fiscal (NIF)',
  })
  @IsNumberString({}, { message: 'O NIF só pode conter números.' })
  NIF!: string;

  @ApiPropertyOptional({
    example: '912345678',
    description: 'Contacto telefónico',
  })
  @IsNumberString({}, { message: 'O contacto só pode conter números.' })
  @IsOptional()
  Contacto?: string;

  @ApiPropertyOptional({
    example: 'url_da_foto.jpg',
    description: 'Link para a foto de perfil',
  })
  @IsString()
  @IsOptional()
  Foto?: string;
}
