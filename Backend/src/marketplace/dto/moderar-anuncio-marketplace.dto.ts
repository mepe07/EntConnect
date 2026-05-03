// Ficheiro: Backend/src/marketplace/dto/moderar-anuncio-marketplace.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';

/**
 * DTO usado para moderar um anúncio do Marketplace.
 */
export class ModerarAnuncioMarketplaceDto {
    @IsEnum(AcaoModeracao)
    acao: AcaoModeracao;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo?: string;
}
