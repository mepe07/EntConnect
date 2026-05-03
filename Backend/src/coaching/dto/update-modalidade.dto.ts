import { PartialType } from '@nestjs/swagger';
import { CreateModalidadeDto } from './create-modalidade.dto';

/**
 * DTO usado para atualizar parcialmente uma modalidade de coaching.
 */
export class UpdateModalidadeDto extends PartialType(CreateModalidadeDto) {}
