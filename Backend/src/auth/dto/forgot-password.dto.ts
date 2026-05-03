import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO usado para iniciar a recuperação de password.
 */
export class ForgotPasswordDto {
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
