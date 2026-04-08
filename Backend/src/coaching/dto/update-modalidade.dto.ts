import { PartialType } from '@nestjs/swagger';
import { CreateModalidadeDto } from './create-modalidade.dto';

// O PartialType herda tudo do CreateModalidadeDto, mas torna os campos opcionais
export class UpdateModalidadeDto extends PartialType(CreateModalidadeDto) {}
