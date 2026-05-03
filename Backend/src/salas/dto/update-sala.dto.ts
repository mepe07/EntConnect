import { PartialType } from '@nestjs/swagger';
import { CreateSalaDto } from './create-sala.dto';

/**
 * DTO usado para atualizar parcialmente uma sala.
 */
export class UpdateSalaDto extends PartialType(CreateSalaDto) {}
