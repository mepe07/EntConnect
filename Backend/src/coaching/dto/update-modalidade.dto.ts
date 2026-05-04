import { PartialType } from '@nestjs/swagger';
import { CreateModalidadeDto } from './create-modalidade.dto';

/**
 * DTO usado para transportar os dados de Update Modalidade.
 */

export class UpdateModalidadeDto extends PartialType(CreateModalidadeDto) {}
