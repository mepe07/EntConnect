// Ficheiro: Backend/src/artigo/dto/publicar-anuncio.dto.ts
import { IsInt, Min, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublicarAnuncioDto {
    @IsInt({ message: 'A quantidade de venda deve ser um número inteiro.' })
    @Min(0, { message: 'A quantidade de venda não pode ser negativa.' })
    Quantidade_A_Venda: number;

    @IsInt({ message: 'A quantidade de aluguer deve ser um número inteiro.' })
    @Min(0, { message: 'A quantidade de aluguer não pode ser negativa.' })
    Quantidade_Para_Alugar: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    Notas_Anuncio?: string;
} 