import { Module, Global } from '@nestjs/common';
import { BlobsService } from './Blobs/blobs.service';

@Global()
@Module({
  providers: [BlobsService],
  exports: [BlobsService],
})
/**
 * Módulo global com serviços de infraestrutura partilhados.
 */
export class InfraestruturaModule {}
