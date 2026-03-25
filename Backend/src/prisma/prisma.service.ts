import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Mal o NestJS arranque, ele liga-se automaticamente à base de dados no Azure
    await this.$connect();
  }
}