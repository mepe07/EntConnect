import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MinLength, IsNumberString } from 'class-validator';

/**
 * DTO usado para atualizar os dados pessoais editáveis de um utilizador.
 */
export class UpdatePessoalDto {
  @ApiProperty({
    description: 'O nome completo do utilizador',
    example: 'Ana Coordenadora',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O nome deve ter pelo menos 3 caracteres' })
  nome?: string;

  @ApiProperty({
    description: 'O NIF (Número de Identificação Fiscal) do utilizador',
    example: '123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(9, 9, { message: 'O NIF deve ter exatamente 9 dígitos' })
  @IsNumberString({}, { message: 'O NIF deve conter apenas números' })
  nif?: string;

  @ApiProperty({
    description: 'O contacto telefónico ou telemóvel',
    example: '912345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNumberString({}, { message: 'O contacto deve conter apenas números' }) 
  @Length(9, 9, { message: 'O contacto deve ter exatamente 9 dígitos' })  
  contacto?: string;
}
