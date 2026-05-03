import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
    providers: [MailService],
    exports: [MailService],
})
/**
 * Módulo responsável pelo envio de emails transacionais.
 */
export class MailModule {}
