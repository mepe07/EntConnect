// Ficheiro: Backend/src/eventos/dto/atualizar-evento.dto.ts

import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { transformarBoolean } from './transformar-boolean';
import { TipoEvento } from '../enums/tipo-evento.enum';

/**
 * DTO usado para atualizar parcialmente um evento existente.
 */
export class AtualizarEventoDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    titulo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(180)
    slug?: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    resumo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(3000)
    descricao?: string;

    @IsOptional()
    @IsEnum(TipoEvento)
    tipo?: TipoEvento;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    local?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    imagem?: string;

    @IsOptional()
    @IsDateString({}, { message: 'A data de início tem de ser uma data válida.' })
    dataInicio?: string;

    @IsOptional()
    @IsDateString({}, { message: 'A data de fim tem de ser uma data válida.' })
    dataFim?: string;

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
} 
