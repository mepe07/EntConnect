import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCoachingDto {
  
  @ApiProperty({ 
    example: '2026-04-10T14:30:00.000Z',
    description: "Data de início do coaching"
   })

  Duracao: Date | string; // Obrigatório. Pode vir como string (ex: "2026-03-25") do Frontend e o Nest trata disso.

  // Todos os campos abaixo são opcionais (por causa do '?' no Prisma)

  @ApiPropertyOptional({ example: 1, description: "ID da direção" })
  ID_Direcao?: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do encarregado de educação" })
  ID_Enc_Educacao?: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do professor" })
  ID_Professor?: number;

  @ApiPropertyOptional({ example: 1, description: "ID do estado do coaching" })
  ID_Estado_Coaching?: number;

  @ApiPropertyOptional({ example: 1, description: "ID da sala" })
  ID_Sala?: number;
  
  @ApiPropertyOptional({ example: 1, description: "ID do coordenador" })
  ID_Coordenador?: number;
}