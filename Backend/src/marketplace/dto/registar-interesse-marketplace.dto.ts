// Ficheiro: Backend/src/marketplace/dto/registar-interesse-marketplace.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoInteresse } from '../enums/tipo-interesse.enum';


/**
 * DTO usado quando um utilizador demonstra interesse num anúncio.
 *
 * O interesse fica associado ao stock principal do artigo.
 * Este DTO permite enviar uma mensagem opcional, o tipo de interesse e uma
 * possível data prevista para recolha.
 */
export class RegistarInteresseMarketplaceDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    mensagem?: string;    // Mensagem opcional enviada pelo utilizador interessado ao dono do anúncio.

    @IsOptional()
    @IsEnum(TipoInteresse)
    tipo?: TipoInteresse;    // Tipo de interesse registado, por exemplo contacto ou outro tipo definido no enum.

    @IsOptional()
    @IsString()
    dataRecolhaPrevista?: string;    // Data prevista para recolha, recebida como string e convertida no service quando existir.
}
