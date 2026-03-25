import { PartialType } from '@nestjs/swagger';
import { CreateCoachingDto } from './create-coaching.dto';

export class UpdateCoachingDto extends PartialType(CreateCoachingDto) {}
