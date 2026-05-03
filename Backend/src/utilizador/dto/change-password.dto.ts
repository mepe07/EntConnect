import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * DTO usado para alterar a password a partir da área autenticada da aplicação.
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'passwordAntiga123' })
  @IsString()
  passAtual!: string;

  @ApiProperty({ example: 'NovaSenha456' })
  @IsString()
  @MinLength(6, { message: 'A nova password deve ter pelo menos 6 caracteres' })
  passNova!: string;
}
