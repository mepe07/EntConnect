import { InternalServerErrorException } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('MailService', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...envOriginal };
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it('deve enviar email de recuperação de password', async () => {
    const sendMail = jest.fn().mockResolvedValue({ accepted: ['user@email.test'] });
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_FROM = 'no-reply@email.test';

    const service = new MailService();
    await service.sendPasswordResetEmail('user@email.test', 'https://reset.test/token');

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test',
      port: 2525,
      secure: false,
      auth: { user: 'smtp-user', pass: 'smtp-pass' },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@email.test',
        to: 'user@email.test',
        subject: 'Recuperação de password - EntConnect',
        text: expect.stringContaining('https://reset.test/token'),
        html: expect.stringContaining('https://reset.test/token'),
      }),
    );
  });

  it('deve lançar erro quando SMTP não está configurado', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const service = new MailService();

    await expect(service.sendPasswordResetEmail('user@email.test', 'link')).rejects.toThrow(InternalServerErrorException);
    expect(createTransport).not.toHaveBeenCalled();
  });
});
