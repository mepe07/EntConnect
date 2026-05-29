import { Type } from 'class-transformer';
import {
  IsInt,
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
  @IsNotEmpty({ message: 'O titulo e obrigatorio.' })
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @Type(() => Number)
  @Min(0, { message: 'A quantidade nao pode ser negativa.' })
  quantidade: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'O estado da peca selecionado e invalido.' })
  idEstado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'O tamanho selecionado e invalido.' })
  idTamanho?: number;
}
