import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AcaoModeracao } from '../enums/acao-moderacao.enum';

/**
 * DTO usado para transportar os dados de Moderar Anuncio Marketplace.
 */

export class ModerarAnuncioMarketplaceDto {
  @IsEnum(AcaoModeracao)
  acao: AcaoModeracao;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
