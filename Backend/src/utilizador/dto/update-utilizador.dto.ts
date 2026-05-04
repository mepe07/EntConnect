import { PartialType } from '@nestjs/swagger';
import { CreateUtilizadorDto } from './create-utilizador.dto';

/**
 * DTO usado para transportar os dados de Update Utilizador.
 */

export class UpdateUtilizadorDto extends PartialType(CreateUtilizadorDto) {}
