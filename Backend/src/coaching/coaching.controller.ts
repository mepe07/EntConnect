import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { CreateCoachingDto } from './dto/create-coaching.dto';
import { UpdateCoachingDto } from './dto/update-coaching.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Coaching') // Tag para agrupar os endpoints relacionados a Coaching no Swagger
@Controller('coaching')
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar uma nova sessão', 
    description: 'Criar uma nova sessão de coaching na base de dados.' 
  })
  @ApiResponse({ status: 201, description: 'A sessão de coaching foi criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Os dados enviados são inválidos (ex: falta a Duração).' })
  @ApiResponse({ status: 500, description: 'Erro interno (ex: o ID da Sala não existe).' })
  create(@Body() createCoachingDto: CreateCoachingDto) {
    return this.coachingService.create(createCoachingDto);
  }

  // @Get()
  // findAll() {
  //   return this.coachingService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.coachingService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateCoachingDto: UpdateCoachingDto) {
  //   return this.coachingService.update(+id, updateCoachingDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.coachingService.remove(+id);
  // }
}
