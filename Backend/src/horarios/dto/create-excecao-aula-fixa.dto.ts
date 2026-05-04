import { IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO usado para transportar os dados de Create Excecao Aula Fixa.
 */

export class CreateExcecaoAulaFixaDto {
  @IsDateString()
  @IsNotEmpty()
  dataCancelada!: string;
}
