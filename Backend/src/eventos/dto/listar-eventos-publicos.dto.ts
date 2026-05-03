// Ficheiro: Backend/src/eventos/dto/listar-eventos-publicos.dto.ts

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

function transformarBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * DTO com filtros aceites na listagem pública de eventos.
 */
export class ListarEventosPublicosDto {
    @IsOptional()
    @IsString()
    pesquisa?: string;

    @IsOptional()
    @IsEnum(TipoEvento)
    tipo?: TipoEvento;

    @IsOptional()
    @Transform(({ value }) => transformarBoolean(value))
    @IsBoolean()
    destaque?: boolean;

    @IsOptional()
    @Transform(({ value }) => transformarBoolean(value))
    @IsBoolean()
    apenasFuturos?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limite?: number;
} 
