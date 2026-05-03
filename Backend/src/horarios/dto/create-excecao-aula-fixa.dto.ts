import { IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO usado para criar uma exceção num horário fixo.
 */
export class CreateExcecaoAulaFixaDto {
  @IsDateString()
  @IsNotEmpty()
  dataCancelada!: string;
}
