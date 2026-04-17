import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'passwordAntiga123' })
  @IsString()
  passAtual!: string; // O ! significa que "Vai existir de certeza"

  @ApiProperty({ example: 'NovaSenha456' })
  @IsString()
  @MinLength(6, { message: 'A nova password deve ter pelo menos 6 caracteres' })
  passNova!: string; // O ! significa que "Vai existir de certeza"
}