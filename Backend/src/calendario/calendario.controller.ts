import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { CalendarioService } from './calendario.service';

@ApiTags('Calendário')
@UseGuards(AuthGuard, RolesGuard)
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @Get()
  @Roles(Role.COORDENADOR)
  @ApiOperation({ summary: 'Obter eventos e sessões de coaching por intervalo de datas' })
  @ApiResponse({ status: 200, description: 'Retorna eventos e coaching para o calendário' })
  async getCalendario(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarioService.getCalendarItems(start, end);
  }
}
