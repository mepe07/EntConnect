import { ApiProperty as ApiPropertyOptional, ApiPropertyOptional as ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO usado para criar uma modalidade de coaching.
 */
export class CreateModalidadeDto {
 @ApiProperty({ example: 'Hip-Hop', description: 'Descrição da modalidade' })
  @IsString()
  @IsNotEmpty()
  Descricao!: string;
}
