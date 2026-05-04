import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
/**
 * Modulo responsavel por agrupar os recursos de Mail.
 */

@Module({
  providers: [MailService],

  exports: [MailService],
})
export class MailModule {}
