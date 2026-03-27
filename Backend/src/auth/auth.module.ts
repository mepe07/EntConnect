import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [
        JwtModule.register({
            global: true,
            // Lembrete: Mover a 'secret' para o ficheiro .env antes de ir para produção!
            secret: 'Entco##ect',
            signOptions: { expiresIn: '2h' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, PrismaService],
})
export class AuthModule { }