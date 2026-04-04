import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './create-disponibilidade.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateDisponibilidadeDto extends PartialType(CreateDisponibilidadeDto) {
  
  // O Estado da Disponibilidade pode ser atualizado para refletir mudanças (ex: de Pendente para Aprovado)  
  @ApiPropertyOptional({
    example: 1,
    description: 'ID do Estado (ex: 1=Aprovado, 2=Pendente, 3=Rejeitado, 4=Anulado)',
  })
  @IsOptional()
  @IsNumber()
  EstadoDisponibilidadeID?: number;

}