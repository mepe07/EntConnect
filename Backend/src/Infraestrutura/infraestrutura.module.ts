import { Module, Global } from '@nestjs/common';
import { BlobsService } from './Blobs/blobs.service';
/**
 * Modulo responsavel por agrupar os recursos de Infraestrutura.
 */

@Global()
@Module({
  providers: [BlobsService],
  exports: [BlobsService],
})
export class InfraestruturaModule {}
