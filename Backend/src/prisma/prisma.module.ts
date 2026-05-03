import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
/**
 * Módulo global que disponibiliza o acesso centralizado ao Prisma.
 */
export class PrismaModule {}
