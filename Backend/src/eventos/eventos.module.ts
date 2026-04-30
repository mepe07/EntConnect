// Ficheiro: Backend/src/eventos/eventos.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

@Module({
    imports: [AuthModule],
    controllers: [EventosController],
    providers: [EventosService],
})
export class EventosModule {
} 