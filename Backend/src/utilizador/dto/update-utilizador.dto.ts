import { PartialType } from '@nestjs/swagger';
import { CreateUtilizadorDto } from './create-utilizador.dto';

/**
 * DTO usado para atualizar parcialmente um utilizador.
 */
export class UpdateUtilizadorDto extends PartialType(CreateUtilizadorDto) {}
