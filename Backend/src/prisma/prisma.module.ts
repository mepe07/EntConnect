import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
/**
 * Modulo responsavel por agrupar os recursos de Prisma.
 */

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
