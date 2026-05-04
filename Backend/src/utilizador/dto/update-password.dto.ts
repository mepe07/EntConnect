import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO usado para transportar os dados de Update Password.
 */

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'novaPassword123',
    description: 'Nova password do utilizador',
  })
  @IsString()
  @MinLength(6, { message: 'A password deve ter pelo menos 6 caracteres.' })
  password!: string;
}
