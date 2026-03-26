import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    // Substituímos o "dadosRecebidos" por "loginDto", o padrão em NestJS para objetos de entrada
    login(@Body() loginDto: Record<string, any>) {

        // Passamos os dados extraídos do DTO diretamente para o serviço
        return this.authService.login(loginDto.username, loginDto.password);
    }
}