// Ficheiro: Backend/src/mail/mail.module.ts

import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
    // Regista o MailService dentro do MailModule.
    providers: [MailService],

    // Exporta o MailService para outros módulos conseguirem usá-lo.
    // O AuthModule precisa disto porque o AuthService injeta MailService.
    exports: [MailService],
})
export class MailModule {}