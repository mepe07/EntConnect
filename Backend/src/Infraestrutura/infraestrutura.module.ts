import { Module, Global } from '@nestjs/common';
import { BlobsService } from './Blobs/blobs.service';

@Global() // Torna este módulo disponível para a App inteira automaticamente
@Module({
  providers: [BlobsService],
  exports: [BlobsService], // CRUCIAL: É isto que permite aos outros módulos usarem o serviço
})
export class InfraestruturaModule {}