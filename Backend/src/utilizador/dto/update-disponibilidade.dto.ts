import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './create-disponibilidade.dto';
import { IsOptional, IsNumber, IsInt } from 'class-validator';

/**
 * DTO usado para transportar os dados de Update Disponibilidade.
 */

export class UpdateDisponibilidadeDto extends PartialType(
  CreateDisponibilidadeDto,
) {
  @ApiPropertyOptional({
    example: 1,
    description:
      'ID do Estado (ex: 1=Aprovado, 2=Pendente, 3=Rejeitado, 4=Anulado)',
  })
  @IsOptional()
  @IsNumber()
  EstadoDisponibilidadeID?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID do Estúdio (Atribuído pela Coordenação na aprovação)',
  })
  @IsOptional()
  @IsInt()
  IdEstudio?: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Valor cobrado por aluno',
  })
  @IsOptional()
  @IsNumber()
  ValorPorAluno?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Numero maximo de alunos definido pela coordenacao',
  })
  @IsOptional()
  @IsInt()
  MaxAlunos?: number;
}
