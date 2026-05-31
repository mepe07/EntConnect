import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO responsável por validar os dados recebidos
 * para criar uma comunicação associada a um evento.
 */
export class CriarComunicacaoEventoDto {
  /**
   * Título curto da comunicação.
   * Exemplo: "Figurino obrigatório".
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo: string;

  /**
   * Mensagem principal da comunicação.
   * Exemplo: "Levar fato preto, sapatilhas brancas e cabelo preso."
   */
  @IsString()
  @IsNotEmpty()
  mensagem: string;

  /**
   * Tipo da comunicação.
   * Exemplo: GERAL, FIGURINO, LOCAL, HORARIO ou DOCUMENTOS.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  /**
   * Indica se a comunicação deve aparecer em destaque.
   */
  @IsOptional()
  @IsBoolean()
  importante?: boolean;
}