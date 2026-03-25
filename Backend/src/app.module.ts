import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoachingModule } from './coaching/coaching.module';
import { UtilizadorModule } from './utilizador/utilizador.module';

@Module({
  imports: [PrismaModule, CoachingModule, UtilizadorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
