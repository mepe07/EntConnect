import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Create Aula Fixa.
 */

export class CreateAulaFixaDto {
  @IsInt()
  @Min(1)
  diaSemana!: number;

  @IsString()
  @IsNotEmpty()
  horaInicio!: string;

  @IsInt()
  @Min(1)
  duracao!: number;

  @IsInt()
  @Min(1)
  idEstudio!: number;

  @IsInt()
  @Min(1)
  idModalidade!: number;

  @IsOptional()
  @IsInt()
  idProfessor?: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
