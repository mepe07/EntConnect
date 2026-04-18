// Ficheiro: Backend/src/marketplace/dto/registar-interesse-marketplace.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoInteresse } from '../enums/tipo-interesse.enum';

export class RegistarInteresseMarketplaceDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    mensagem?: string;

    @IsOptional()
    @IsEnum(TipoInteresse)
    tipo?: TipoInteresse;

    @IsOptional()
    @IsString()
    dataRecolhaPrevista?: string;
}
