import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Role } from './enums/roles.enum';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const user = await this.obterUtilizadorPorUsername(loginDto.username);

        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        const passwordValida = await bcrypt.compare(loginDto.password, user.Password);

        if (!passwordValida) {
            throw new UnauthorizedException('Credenciais inválidas.');
        }

        if (!user.Ativo) {
            throw new UnauthorizedException('A sua conta encontra-se inativa. Contacte a coordenação.');
        }

        const userRole = this.determinarRole(user);

        const payload = {
            sub: user.ID_Utilizador,
            username: user.Utilizador,
            role: userRole,
            idPessoa: user.ID_Pessoa,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
            role: userRole,
        };
    }

    private async obterUtilizadorPorUsername(username: string) {
        return this.prisma.utilizador.findUnique({
            where: {
                Utilizador: username,
            },
            include: {
                Pessoa: {
                    include: {
                        Professor: true,
                        Coordenador: true,
                        Direcao: true,
                        Enc_Educacao: true,
                    },
                },
            },
        });
    }

    private determinarRole(user: any): Role {
        if (user.Pessoa?.Professor) {
            return Role.PROFESSOR;
        }

        if (user.Pessoa?.Coordenador) {
            return Role.COORDENADOR;
        }

        if (user.Pessoa?.Enc_Educacao) {
            return Role.ENC_EDUCACAO;
        }

        throw new UnauthorizedException('Utilizador sem perfil válido.');
    }
} 