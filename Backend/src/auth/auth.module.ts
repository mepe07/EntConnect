import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { MailModule } from '../mail/mail.module';


@Module({
    imports: [
        MailModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const expiresIn = configService.get<string>('JWT_EXPIRES_IN') ?? '1d';

                return {
                    secret: configService.getOrThrow<string>('JWT_SECRET'),
                    signOptions: {
                        expiresIn,
                    } as JwtModuleOptions['signOptions'],
                };
            },
        }),
    ],
    controllers: [
        AuthController
    ],
    providers: [
        AuthService, 
        AuthGuard, 
        RolesGuard
    ],
    exports: [
        AuthService,
        AuthGuard,
        RolesGuard,
        JwtModule
    ],
})
/**
 * Módulo de autenticação e autorização da aplicação.
 */
export class AuthModule {
}
