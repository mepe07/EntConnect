import { PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './create-disponibilidade.dto';

export class UpdateDisponibilidadeDto extends PartialType(CreateDisponibilidadeDto) {}