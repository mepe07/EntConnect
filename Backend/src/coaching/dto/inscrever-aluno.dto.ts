import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class InscreverAlunoDto {
  
  @ApiProperty({ description: 'ID do Aluno a inscrever na sessão', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idAluno!: number;

  @ApiProperty({ description: 'ID do Encarregado de Educação', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idEncEducacao!: number;

  @ApiProperty({ description: 'ID do Professor', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idProfessor!: number;

  @ApiProperty({ description: 'ID do estado coaching', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idEstadoCoaching!: number;

  @ApiProperty({ description: 'ID do estúdio', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idSala!: number;

  @ApiProperty({ description: 'ID do Coordenador', example: 1 })
  @IsNotEmpty()
  @IsInt()
  idCoordenador!: number;

  @ApiProperty({ description: 'Valor a pagar por aluno inscrito', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  valorPorAluno!: number;

  @ApiProperty({ example: '2026-05-10T14:30:00Z', description: 'Data e hora de início' })
  @IsNotEmpty()
  inicio_Coaching!: Date | string;

  @ApiProperty({ description: 'Duração da sessão de coaching', example: 60 })
  @IsNotEmpty()
  @IsInt()
  duracao!: number;

  @ApiProperty({ description: 'Observações sobre a inscrição', example: 'Aluno com presença regular' })
  @IsString()
  obs?: string;

  @ApiProperty({ description: 'Valor em falta', example: 100 })
  @IsNotEmpty()
  @IsNumber()
  valorEmFalta!: number;


}
