import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaturacaoService } from './faturacao.service';
import { CreateFaturacaoDto } from './dto/create-faturacao.dto';
import { UpdateFaturacaoDto } from './dto/update-faturacao.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('faturacao')
export class FaturacaoController {
  constructor(private readonly faturacaoService: FaturacaoService) {}

  @Get('geral')
  @ApiOperation({ summary: 'Obter a faturação geral de todos os encarregados de educação' })
  async obterFaturacaoGeral() {
    return this.faturacaoService.obterFaturacaoGeral();
  }

  @Get('encarregado/:id')
  @ApiOperation({ summary: 'Obter a faturação de um encarregado de educação específico' })
  async obterFaturacaoPorEncarregado(@Param('id') id: string) {
    return this.faturacaoService.obterFaturacaoPorEncarregado(+id);
  }

  @Patch('pagar/:idCoaching/:idAluno')
  @ApiOperation({ summary: 'Registar o pagamento de um aluno numa sessão de coaching' })
  async registarPagamento(
    @Param('idCoaching') idCoaching: string, 
    @Param('idAluno') idAluno: string
  ) {
    // Usamos o sinal '+' para converter as strings que vêm do URL para números (Int)
    return this.faturacaoService.registarPagamento(+idCoaching, +idAluno);
  }
}
