import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateExcecaoAulaFixaDto {
  @IsDateString()
  @IsNotEmpty()
  dataCancelada!: string;
}
