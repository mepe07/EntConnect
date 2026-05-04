import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
/**
 * Servico responsavel pela logica de Prisma.
 */

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * Executa a inicializacao do modulo.
   * @returns Resultado da operacao.
   */

  async onModuleInit() {
    await this.$connect();
  }
}
