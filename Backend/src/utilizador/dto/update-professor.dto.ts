import { PartialType } from '@nestjs/swagger';
import { CreateProfessorDto } from './create-professor.dto';

/**
 * DTO usado para transportar os dados de Update Professor.
 */

export class UpdateProfessorDto extends PartialType(CreateProfessorDto) {}
