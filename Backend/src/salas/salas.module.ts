import { Module } from '@nestjs/common';
import { SalasService } from './salas.service';
import { SalasController } from './salas.controller';
import { AuthModule } from '../auth/auth.module';
/**
 * Modulo responsavel por agrupar os recursos de Salas.
 */

@Module({
    imports: [AuthModule],
    controllers: [SalasController],
    providers: [SalasService],
})
export class SalasModule {}
