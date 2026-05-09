import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TrocarRoleDto } from './dto/trocar-role.dto';
import { AuthGuard } from './auth.guard';
import { UtilizadorAutenticado } from '../common/interfaces/utilizador-autenticado.interface';
import { Public } from './decorators/public.decorator';
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
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Troca a role ativa da sessao autenticada.
   * @param req Dados recebidos para a operacao.
   * @param trocarRoleDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('trocar-role')
  trocarRole(
    @Request() req: { user: UtilizadorAutenticado },
    @Body() trocarRoleDto: TrocarRoleDto,
  ) {
    return this.authService.trocarRole(req.user, trocarRoleDto.role);
  }

  /**
   * Atualiza os dados da sessao autenticada.
   * @param req Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('sessao')
  atualizarSessao(@Request() req: { user: UtilizadorAutenticado }) {
    return this.authService.atualizarSessao(req.user);
  }

  /**
   * Inicia o fluxo de recuperacao de password.
   * @param forgotPasswordDto Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @HttpCode(HttpStatus.OK)
  @Public()
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
  @Public()
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
