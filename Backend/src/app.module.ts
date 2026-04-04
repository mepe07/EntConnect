import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CoachingModule } from './coaching/coaching.module';
import { UtilizadorModule } from './utilizador/utilizador.module';
import { FaturacaoModule } from './faturacao/faturacao.module';
import { ArtigoModule } from './artigo/artigo.module';
import { AuthModule } from './auth/auth.module';
import { InfraestruturaModule } from './Infraestrutura/infraestrutura.module'; //Azure blobs
import { SalasModule } from './salas/salas.module';

@Module({
  //módulos
  imports: [
            PrismaModule, 
            CoachingModule, 
            UtilizadorModule, 
            FaturacaoModule, 
            ArtigoModule, 
            AuthModule, 
            InfraestruturaModule,
            SalasModule
          ],

})
export class AppModule {}
