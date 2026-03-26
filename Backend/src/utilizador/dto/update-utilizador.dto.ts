import { PartialType } from '@nestjs/swagger';
import { CreateUtilizadorDto } from './create-utilizador.dto';

export class UpdateUtilizadorDto extends PartialType(CreateUtilizadorDto) {}
