import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HorariosController } from './horarios.controller';
import { HorariosService } from './horarios.service';

@Module({
  imports: [PrismaModule],
  controllers: [HorariosController],
  providers: [HorariosService],
})
export class HorariosModule {}
