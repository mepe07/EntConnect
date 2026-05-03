import { PartialType } from '@nestjs/swagger';
import { CreateFaturacaoDto } from './create-faturacao.dto';

/**
 * DTO usado para atualizar parcialmente um registo de faturação.
 */
export class UpdateFaturacaoDto extends PartialType(CreateFaturacaoDto) {}
