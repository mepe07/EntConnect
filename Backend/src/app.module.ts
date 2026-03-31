import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CoachingModule } from './coaching/coaching.module';
import { UtilizadorModule } from './utilizador/utilizador.module';
import { FaturacaoModule } from './faturacao/faturacao.module';
import { ArtigoModule } from './artigo/artigo.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, CoachingModule, UtilizadorModule, FaturacaoModule, ArtigoModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
