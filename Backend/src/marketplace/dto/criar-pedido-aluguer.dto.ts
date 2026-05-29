import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Criar Pedido Aluguer.
 */
export class CriarPedidoAluguerDto {
  @IsNotEmpty({ message: 'A data de início é obrigatória.' })
  @IsDateString(
    {},
    { message: 'A data de início tem de estar num formato válido.' },
  )
  dataInicio!: string;

  @IsNotEmpty({ message: 'A data de fim é obrigatória.' })
  @IsDateString({}, { message: 'A data de fim tem de estar num formato válido.' })
  dataFim!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensagem?: string;
}
