import { PartialType } from '@nestjs/swagger';
import { CreateFaturacaoDto } from './create-faturacao.dto';

export class UpdateFaturacaoDto extends PartialType(CreateFaturacaoDto) {}
