// Ficheiro: Backend/src/marketplace/dto/moderar-anuncio-marketplace.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';

/**
 * DTO usado para aplicar uma ação de moderação sobre um anúncio.
 *
 * A moderação pode remover, reativar ou arquivar um anúncio, conforme os valores
 * definidos no enum AcaoModeracao.
 *
 * Este DTO valida apenas a ação pedida e o motivo opcional.
 * O cálculo do novo estado fica no helper de moderação e a persistência fica no service.
 */
export class ModerarAnuncioMarketplaceDto {
    @IsEnum(AcaoModeracao)
    acao: AcaoModeracao;    // Ação de moderação a aplicar ao anúncio.

    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo?: string;    // Motivo opcional que justifica a ação de moderação.
}
