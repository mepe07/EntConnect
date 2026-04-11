import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './create-disponibilidade.dto';
import { IsOptional, IsNumber, IsInt } from 'class-validator';

export class UpdateDisponibilidadeDto extends PartialType(CreateDisponibilidadeDto) {
  
  // O Estado da Disponibilidade pode ser atualizado para refletir mudanças (ex: de Pendente para Aprovado)  
  @ApiPropertyOptional({
    example: 1,
    description: 'ID do Estado (ex: 1=Aprovado, 2=Pendente, 3=Rejeitado, 4=Anulado)',
  })
  @IsOptional()
  @IsNumber()
  EstadoDisponibilidadeID?: number;

  @ApiPropertyOptional({ 
    example: 3, 
    description: 'ID do Estúdio (Atribuído pela Coordenação na aprovação)' 
  })
  @IsOptional()
  @IsInt()
  IdEstudio?: number;

  @ApiPropertyOptional({ 
    example: 25.50, 
    description: 'Valor por hora da sessão de coaching (Atribuído pela Coordenação)' 
  })
  @IsOptional()
  @IsNumber()
  ValorHora?: number;
}