import { PartialType } from '@nestjs/swagger';
import { CreateSalaDto } from './create-sala.dto';

/**
 * DTO usado para transportar os dados de Update Sala.
 */

export class UpdateSalaDto extends PartialType(CreateSalaDto) {}
