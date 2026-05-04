import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO usado para transportar os dados de Criar Item Inventario.
 */

export class CriarItemInventarioDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @Type(() => Number)
  @Min(0, { message: 'A quantidade não pode ser negativa.' })
  quantidade: number;
}
