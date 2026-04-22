import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
    imports: [
        JwtModule.register({
            global: true, // Permite usar o JwtService em qualquer parte da aplicação sem precisar importar o módulo novamente.
            // Lembrete: Mover a 'secret' para o ficheiro .env antes de ir para produção!
            secret: 'Entco##ect',
            signOptions: { expiresIn: '8h' },
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthGuard,
        RolesGuard,
        PrismaService,
    ],
    exports: [
        AuthService,
        AuthGuard,
        RolesGuard,
    ],
})
export class AuthModule { }