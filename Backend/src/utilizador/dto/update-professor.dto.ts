import { PartialType } from '@nestjs/swagger';
import { CreateProfessorDto } from './create-professor.dto';

/**
 * DTO usado para atualizar parcialmente um professor.
 */
export class UpdateProfessorDto extends PartialType(CreateProfessorDto) {}
