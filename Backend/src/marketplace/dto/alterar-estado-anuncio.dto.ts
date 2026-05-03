// Ficheiro: Backend/src/marketplace/dto/alterar-estado-anuncio.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAnuncio } from '../enums/estado-anuncio.enum';

/**
 * DTO usado para alterar o estado de um anúncio.
 *
 * Esta alteração pode ser usada em fluxos de gestão do anúncio, como ativar,
 * remover, reservar ou concluir, dependendo das regras aplicadas no service.
 *
 * O DTO apenas valida o formato dos dados.
 * A regra sobre quem pode alterar e quais transições são permitidas fica no service.
 */
export class AlterarEstadoAnuncioDto {
    @IsEnum(EstadoAnuncio)
    estado: EstadoAnuncio;    // Novo estado pretendido para o anúncio.

    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo?: string;    // Motivo opcional associado à alteração de estado.
}
