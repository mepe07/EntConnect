import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoAnuncio } from '../enums/tipo-anuncio.enum';

/**
 * DTO usado para transportar os dados de Criar Anuncio Marketplace.
 */

export class CriarAnuncioMarketplaceDto {
  @IsString({ message: 'O titulo do anúncio é obrigatório.' })
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @IsOptional()
  @IsString()
  foto?: string;

  @IsEnum(TipoAnuncio)
  tipoAnuncio: TipoAnuncio;

  @Type(() => Number)
  @IsInt({ message: 'A quantidade total tem de ser um número inteiro.' })
  @Min(1)
  quantidadeTotal: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A quantidade disponível tem de ser um número inteiro.' })
  @Min(1)
  quantidadeDisponivel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantidadeVenda?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantidadeAluguer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idEstado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idTamanho?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notasInternas?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  aluguerContinuo?: boolean;
}
