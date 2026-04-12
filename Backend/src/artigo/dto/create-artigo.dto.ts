// Ficheiro: src/artigo/dto/create-artigo.dto.ts

import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer'; 

export class CreateArtigoDto {
    // ==========================================
    // 1. DADOS DO CATÁLOGO
    // ==========================================
    @IsString({ message: 'O nome do artigo é obrigatório.' })
    @MaxLength(255)
    Nome: string;

    @IsOptional() @IsString() @MaxLength(255) Notas?: string;
    @IsOptional() @IsString() Foto?: string;

    // Converte as chaves estrangeiras de utilizadores
    @IsOptional() @Type(() => Number) @IsInt() ID_Coordenador?: number;
    @IsOptional() @Type(() => Number) @IsInt() ID_Direcao?: number;
    @IsOptional() @Type(() => Number) @IsInt() ID_Professor?: number;
    @IsOptional() @Type(() => Number) @IsInt() ID_Enc_Educacao?: number;

    // ==========================================
    // 2. DADOS DO ARMAZÉM (Prateleira Física)
    // ==========================================
    @Type(() => Number) 
    @IsInt({ message: 'O stock total tem de ser um número.' }) 
    @Min(1, { message: 'O stock total tem de ser pelo menos 1.' })
    Quantidade_Total: number;

    @Type(() => Number)
    @IsInt({ message: 'A quantidade de venda tem de ser um número.' }) 
    @Min(0)
    Quantidade_Venda: number;

    @Type(() => Number)
    @IsInt({ message: 'A quantidade de aluguer tem de ser um número.' }) 
    @Min(0)
    Quantidade_Aluguer: number;

    // ==========================================
    // 3. TABELAS AUXILIARES (Especificações)
    // ==========================================
    @IsOptional() @Type(() => Number) @IsInt() ID_Cor?: number;
    @IsOptional() @Type(() => Number) @IsInt() ID_Estado?: number;
    @IsOptional() @Type(() => Number) @IsInt() ID_Tamanho?: number;
} 