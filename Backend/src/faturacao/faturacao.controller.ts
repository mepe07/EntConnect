import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { CreateFaturacaoDto } from './dto/create-faturacao.dto';
import { UpdateFaturacaoDto } from './dto/update-faturacao.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '../auth/auth.guard';
/**
 * Controlador responsavel pelos pedidos de Faturacao.
 */

@ApiTags('Faturacao')
@UseGuards(AuthGuard, RolesGuard)
@Controller('faturacao')
export class FaturacaoController {
  constructor(private readonly faturacaoService: FaturacaoService) {}
  /**
   * Executa a operacao obter faturacao geral.
   * @returns Resultado da operacao.
   */

  @Get('geral')
  @ApiOperation({
    summary: 'Obter a faturação geral de todos os encarregados de educação',
  })
  async obterFaturacaoGeral() {
    return this.faturacaoService.obterFaturacaoGeral();
  }
  /**
   * Executa a operacao get relatorio.
   * @param inicioStr Dados recebidos para a operacao.
   * @param fimStr Dados recebidos para a operacao.
   * @param authHeader Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('Relatorio')
  async getRelatorio(
    @Query('inicio') inicioStr: string,
    @Query('fim') fimStr: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Acesso negado: Token não encontrado na mochila.',
      );
    }
    if (!inicioStr || !fimStr) {
      throw new BadRequestException(
        'As datas de início e fim são obrigatórias.',
      );
    }

    const token = authHeader.split(' ')[1];

    let userPayload;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      );

      userPayload = JSON.parse(jsonPayload);
    } catch (e) {
      throw new UnauthorizedException('Token inválido ou corrompido.');
    }

    const role = userPayload.role;
    const userId = userPayload.sub;

    const dataInicio = new Date(inicioStr);
    const dataFim = new Date(fimStr);

    return this.faturacaoService.obterRelatorioFaturacaoGeral(
      dataInicio,
      dataFim,
      role,
      userId,
    );
  }
  /**
   * Executa a operacao obter faturacao por encarregado.
   * @param id Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('encarregado/:id')
  @ApiOperation({
    summary: 'Obter a faturação de um encarregado de educação específico',
  })
  async obterFaturacaoPorEncarregado(@Param('id') id: string) {
    return this.faturacaoService.obterFaturacaoPorEncarregado(+id);
  }
  /**
   * Executa a operacao obter pagamentos coaching admin.
   * @param inicioStr Dados recebidos para a operacao.
   * @param fimStr Dados recebidos para a operacao.
   * @param professor Dados recebidos para a operacao.
   * @param encarregado Dados recebidos para a operacao.
   * @param estado Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('pagamentos-coaching')
  @ApiOperation({
    summary: 'Listar pagamentos de coaching para gestao administrativa',
  })
  async obterPagamentosCoachingAdmin(
    @Query('inicio') inicioStr?: string,
    @Query('fim') fimStr?: string,
    @Query('professor') professor?: string,
    @Query('encarregado') encarregado?: string,
    @Query('estado') estado?: string,
  ) {
    const inicio = inicioStr ? new Date(inicioStr) : undefined;
    const fim = fimStr ? new Date(fimStr) : undefined;

    if (inicio && isNaN(inicio.getTime())) {
      throw new BadRequestException('O formato da data de inicio e invalido.');
    }

    if (fim && isNaN(fim.getTime())) {
      throw new BadRequestException('O formato da data final e invalido.');
    }

    return this.faturacaoService.obterPagamentosCoachingAdmin({
      inicio,
      fim,
      professor,
      encarregado,
      estado,
    });
  }
  /**
   * Executa a operacao registar pagamento.
   * @param idCoaching Dados recebidos para a operacao.
   * @param idAluno Dados recebidos para a operacao.
   * @param valorPago Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Patch('pagar/:idCoaching/:idAluno')
  @ApiOperation({
    summary: 'Registar o pagamento de um aluno numa sessão de coaching',
  })
  async registarPagamento(
    @Param('idCoaching') idCoaching: string,
    @Param('idAluno') idAluno: string,
    @Body('valorPago') valorPago?: number,
  ) {
    return this.faturacaoService.registarPagamento(
      +idCoaching,
      +idAluno,
      valorPago === undefined || valorPago === null
        ? undefined
        : Number(valorPago),
    );
  }
  /**
   * Executa a operacao get historico.
   * @param inicioStr Dados recebidos para a operacao.
   * @param fimStr Dados recebidos para a operacao.
   * @param authHeader Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('Historico')
  @ApiOperation({
    summary: 'Gera o relatório de histórico para a coordenadora',
  })
  async getHistorico(
    @Query('inicio') inicioStr: string,
    @Query('fim') fimStr: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!inicioStr || !fimStr) {
      throw new BadRequestException(
        'As datas de início e fim são obrigatórias.',
      );
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Acesso negado: Token em falta.');
    }

    const token = authHeader.split(' ')[1];
    let userPayload;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      userPayload = JSON.parse(jsonPayload);
    } catch (e) {
      throw new UnauthorizedException('Token inválido.');
    }

    const role = userPayload.role;
    const userId = userPayload.sub;

    const dateInicio = new Date(inicioStr);
    const dateFim = new Date(fimStr);

    if (isNaN(dateInicio.getTime()) || isNaN(dateFim.getTime())) {
      throw new BadRequestException(
        'O formato das datas fornecidas é inválido.',
      );
    }

    return this.faturacaoService.getHistoricoCoaching(
      dateInicio,
      dateFim,
      role,
      userId,
    );
  }
  /**
   * Executa a operacao get dashboard.
   * @param inicioStr Dados recebidos para a operacao.
   * @param fimStr Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  @Get('dashboard-financeiro')
  @ApiOperation({
    summary: 'Obtém os dados aglomerados para o Dashboard de Estatísticas',
  })
  async getDashboard(
    @Query('inicio') inicioStr: string,
    @Query('fim') fimStr: string,
  ) {
    if (!inicioStr || !fimStr) {
      throw new BadRequestException(
        'As datas de início e fim são obrigatórias.',
      );
    }

    const dateInicio = new Date(inicioStr);
    const dateFim = new Date(fimStr);

    dateFim.setHours(23, 59, 59, 999);

    if (isNaN(dateInicio.getTime()) || isNaN(dateFim.getTime())) {
      throw new BadRequestException(
        'O formato das datas fornecidas é inválido.',
      );
    }

    return this.faturacaoService.getDashboardFinanceiro(dateInicio, dateFim);
  }
  /**
   * Executa a operacao get previsao.
   * @returns Resultado da operacao.
   */

  @Get('previsao-financeira')
  @ApiOperation({
    summary: 'Obtém a previsão de receita financeira para os próximos 3 meses',
  })
  async getPrevisao() {
    return this.faturacaoService.getPrevisaoFinanceira();
  }
}
