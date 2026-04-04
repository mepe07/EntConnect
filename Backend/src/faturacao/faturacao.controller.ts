import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
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
  @Get('Relatorio')
    @ApiOperation({ summary: 'Gera o relatório de performance para a coordenadora' })
    async getRelatorio(
        @Query('inicio') inicioStr: string,
        @Query('fim') fimStr: string,
    ) {
        // 1. Verificação de segurança: as strings existem?
        if (!inicioStr || !fimStr) {
            throw new BadRequestException("As datas de início e fim são obrigatórias.");
        }

        // 2. Criamos os objetos de data reais
        const dateInicio = new Date(inicioStr);
        const dateFim = new Date(fimStr);

        // 3. Validamos os OBJETOS e não as strings!
        if (isNaN(dateInicio.getTime()) || isNaN(dateFim.getTime())) {
            throw new BadRequestException("O formato das datas fornecidas é inválido.");
        }

        // 4. Chamamos o Service com o nome CORRETO
        return this.faturacaoService.obterRelatorioFaturacaoGeral(dateInicio, dateFim);
    }
}
