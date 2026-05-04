import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
/**
 * Controlador responsavel pelos pedidos de Auth.
 */

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  /**
   * Autentica um utilizador e devolve os dados da sessao.
   * @param loginDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  /**
   * Inicia o fluxo de recuperacao de password.
   * @param forgotPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }
  /**
   * Conclui o fluxo de redefinicao de password.
   * @param resetPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
