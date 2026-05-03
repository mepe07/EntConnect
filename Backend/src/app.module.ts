import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CoachingModule } from './coaching/coaching.module';
import { UtilizadorModule } from './utilizador/utilizador.module';
import { FaturacaoModule } from './faturacao/faturacao.module';
import { AuthModule } from './auth/auth.module';
import { InfraestruturaModule } from './Infraestrutura/infraestrutura.module';
import { SalasModule } from './salas/salas.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { EventosModule } from './eventos/eventos.module';
import { EstatisticasModule } from './estatistica/estatisticas.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    CoachingModule,
    UtilizadorModule,
    FaturacaoModule,
    MarketplaceModule,
    AuthModule,
    InfraestruturaModule,
    SalasModule,
    EventosModule,
    EstatisticasModule,
  ],
})
export class AppModule {}
