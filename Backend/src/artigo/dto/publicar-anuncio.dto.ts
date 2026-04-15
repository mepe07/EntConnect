// Ficheiro: Backend/src/artigo/dto/publicar-anuncio.dto.ts
import { IsInt, Min, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublicarAnuncioDto {
    @IsInt({ message: 'A quantidade a vender deve ser um número inteiro.' })
    @Min(1, { message: 'Tens de colocar pelo menos 1 unidade na montra.' })
    Quantidade_A_Venda!: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    Notas_Anuncio?: string;
} 