import { PartialType } from '@nestjs/swagger';
import { CreateFaturacaoDto } from './create-faturacao.dto';

/**
 * DTO usado para transportar os dados de Update Faturacao.
 */

export class UpdateFaturacaoDto extends PartialType(CreateFaturacaoDto) {}
