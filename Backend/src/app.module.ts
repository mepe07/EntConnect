import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CoachingModule } from './coaching/coaching.module';
import { UtilizadorModule } from './utilizador/utilizador.module';

@Module({
  imports: [PrismaModule, CoachingModule, UtilizadorModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
