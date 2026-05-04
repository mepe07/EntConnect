import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TipoEvento } from '../enums/tipo-evento.enum';

/**
 * Executa a operacao transformar boolean.
 * @param value Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

function transformarBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * DTO usado para transportar os dados de Listar Eventos Gestao.
 */

export class ListarEventosGestaoDto {
  @IsOptional()
  @IsString()
  pesquisa?: string;

  @IsOptional()
  @IsEnum(TipoEvento)
  tipo?: TipoEvento;

  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  publico?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  publicado?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  destaque?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  destaqueLogin?: boolean;

  @IsOptional()
  @Transform(({ value }) => transformarBoolean(value))
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
