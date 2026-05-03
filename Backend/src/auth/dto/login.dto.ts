import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO usado para autenticar um utilizador com username e password.
 */
export class LoginDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
} 
