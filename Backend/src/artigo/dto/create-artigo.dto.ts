import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateArtigoDto {
    // ==========================================
    // 1. DADOS DO CATÁLOGO (Tabela Artigo)
    // ==========================================
    @IsString({ message: 'O nome do artigo é obrigatório.' })
    @MaxLength(255)
    Nome: string;

    @IsOptional() @IsString() @MaxLength(255) Notas?: string;
    @IsOptional() @IsString() Foto?: string;

    // Chaves Estrangeiras para as categorias
    @IsOptional() @IsInt() ID_Coordenador?: number;
    @IsOptional() @IsInt() ID_Direcao?: number;
    @IsOptional() @IsInt() ID_Professor?: number;
    @IsOptional() @IsInt() ID_Enc_Educacao?: number;

    // ==========================================
    // 2. DADOS DO ARMAZÉM (Tabela Stock_Armazem)
    // ==========================================
    @IsInt({ message: 'O stock total tem de ser um número.' }) 
    @Min(1, { message: 'O stock total tem de ser pelo menos 1.' })
    Quantidade_Total: number;

    @IsInt() @Min(0)
    Quantidade_Venda: number;

    @IsInt() @Min(0)
    Quantidade_Aluguer: number;

    // Características do lote
    @IsOptional() @IsInt() ID_Cor?: number;
    @IsOptional() @IsInt() ID_Estado?: number;
    @IsOptional() @IsInt() ID_Tamanho?: number;
} 