import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateArtigoDto {
    // 1. Dados Base Obrigatórios
    @IsString({ message: 'O nome do artigo é obrigatório e deve ser texto.' })
    @MaxLength(255)
    Nome: string;

    @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
    @Min(1, { message: 'A quantidade mínima para registar no armazém é 1.' })
    Quantidade: number;

    // 2. Dados Extra (Opcionais)
    @IsOptional()
    @IsString()
    @MaxLength(255)
    Notas?: string;

    @IsOptional()
    @IsString()
    Foto?: string;

    // 3. As Chaves de quem é o dono na Escola (Só um deles será preenchido)
    @IsOptional() @IsInt() ID_Coordenador?: number;
    @IsOptional() @IsInt() ID_Direcao?: number;
    @IsOptional() @IsInt() ID_Professor?: number;
    @IsOptional() @IsInt() ID_Enc_Educacao?: number;

    // 4. As Tabelas de Apoio (Características)
    @IsOptional() @IsInt() ID_Cor?: number;
    @IsOptional() @IsInt() ID_Estado?: number;
    @IsOptional() @IsInt() ID_Tamanho?: number;
}
