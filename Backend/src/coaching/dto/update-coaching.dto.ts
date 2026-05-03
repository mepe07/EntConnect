import { PartialType } from '@nestjs/swagger';
import { CreateCoachingDto } from './create-coaching.dto';

/**
 * DTO usado para atualizar parcialmente uma sessão de coaching.
 */
export class UpdateCoachingDto extends PartialType(CreateCoachingDto) {}
