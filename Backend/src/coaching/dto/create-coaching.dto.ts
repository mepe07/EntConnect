import { ApiProperty as ApiPropertyOptional, ApiPropertyOptional as ApiProperty } from "@nestjs/swagger";

/**
 * DTO usado para criar uma sessão de coaching.
 */
export class CreateCoachingDto {
  @ApiPropertyOptional({ example: 3, description: "ID da direção" })
  ID_Direcao: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do encarregado de educação" })
  ID_Enc_Educacao: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do professor" })
  ID_Professor: number;

  @ApiPropertyOptional({ example: 1, description: "ID do estado do coaching" })
  ID_Estado_Coaching: number;

  @ApiPropertyOptional({ example: 1, description: "ID da sala" })
  ID_Sala: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do coordenador" })
  ID_Coordenador: number;

  @ApiPropertyOptional({ example: 50.00, description: 'Preço total da sessão' })
  Preco: number; 

  @ApiPropertyOptional({ example: 50.00, description: 'Valor que ainda falta pagar' })
  Valor_em_Falta: number;

  @ApiPropertyOptional({ example: '2026-05-10T14:30:00Z', description: 'Data e hora de início' })
  Inicio_Coaching: Date | string;
}
