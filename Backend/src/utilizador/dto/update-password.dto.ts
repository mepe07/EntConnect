import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO usado para atualizar diretamente a password de um utilizador.
 */
export class UpdatePasswordDto {
    @ApiProperty({ example: 'novaPassword123', description: 'Nova password do utilizador' })
    @IsString()
    @MinLength(6, { message: 'A password deve ter pelo menos 6 caracteres.' })
    password!: string;
}
