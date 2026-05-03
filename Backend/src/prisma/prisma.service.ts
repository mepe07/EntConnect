import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
/**
 * Serviço que encapsula o cliente Prisma e gere a ligação inicial à base de dados.
 */
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * Estabelece a ligação à base de dados quando o módulo é inicializado.
   */
  async onModuleInit() {
    await this.$connect();
  }
}
