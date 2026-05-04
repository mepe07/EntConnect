import { PartialType } from '@nestjs/swagger';
import { CreateCoachingDto } from './create-coaching.dto';

/**
 * DTO usado para transportar os dados de Update Coaching.
 */

export class UpdateCoachingDto extends PartialType(CreateCoachingDto) {}
