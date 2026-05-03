import { Type } from 'class-transformer';
import { isInt,
IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO usado para criar um item no inventário interno da escola.
 *
 * Este item ainda não é publicado diretamente no Marketplace.
 * Primeiro fica registado como inventário institucional e só depois pode ser
 * publicado através do fluxo de publicação de inventário.
 *
 * A fotografia, quando existir, é recebida por multipart/form-data e validada
 * fora do DTO.
 */
export class CriarItemInventarioDto {
    @IsString()
    @IsNotEmpty({ message: 'O título é obrigatório.' })
    @MaxLength(255)
    titulo: string;    // Nome/título do item de inventário.

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;    // Descrição opcional do item para contexto interno.

    @Type(() => Number)
    @Min(0, { message: 'A quantidade não pode ser negativa.' })
    quantidade: number;    // Quantidade total existente no inventário da escola.
} 
