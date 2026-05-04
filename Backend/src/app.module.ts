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
import { CalendarioModule } from './calendario/calendario.module';
import { ConfigModule } from '@nestjs/config';
import { HorariosModule } from './horarios/horarios.module';
/**
 * Modulo responsavel por agrupar os recursos de App.
 */

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
    CalendarioModule,
    HorariosModule,
  ],
})
export class AppModule {}
