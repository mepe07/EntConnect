import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO usado para concluir a reposição de password.
 */
export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    token: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
