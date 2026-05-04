import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO usado para transportar os dados de Forgot Password.
 */

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
