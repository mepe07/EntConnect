import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private transporter?: Transporter;

    async sendPasswordResetEmail(to: string, resetLink: string) {
        const transporter = this.getTransporter();

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject: 'Recuperação de password - EntConnect',
            text: [
                'Recebemos um pedido para repor a password da sua conta EntConnect.',
                '',
                `Use este link para escolher uma nova password: ${resetLink}`,
                '',
                'Este link expira em 30 minutos.',
                'Se não pediu esta recuperação, pode ignorar este email.',
            ].join('\n'),
            html: `
                <p>Recebemos um pedido para repor a password da sua conta EntConnect.</p>
                <p><a href="${resetLink}">Clique aqui para escolher uma nova password</a>.</p>
                <p>Este link expira em 30 minutos.</p>
                <p>Se não pediu esta recuperação, pode ignorar este email.</p>
            `,
        });
    }

    private getTransporter() {
        if (this.transporter) {
            return this.transporter;
        }

        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            throw new InternalServerErrorException('Serviço de email não configurado.');
        }

        this.transporter = createTransport({
            host,
            port,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user,
                pass,
            },
        });

        return this.transporter;
    }
}
