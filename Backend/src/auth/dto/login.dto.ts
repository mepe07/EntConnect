import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO usado para transportar os dados de Login.
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
