import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    // Injeção de dependências: as ferramentas de trabalho do nosso serviço
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    // A função agora tem a assinatura padrão da indústria
    async login(username: string, password: string) {

        // 1. A busca na BD. Repara que a variável é 'user', mas as chaves de 
        // pesquisa (Utilizador, Pessoa, etc) têm de respeitar o teu schema.prisma
        const user = await this.prisma.utilizador.findUnique({
            where: {
                Utilizador: username
            },
            include: {
                Pessoa: {
                    include: {
                        Professor: true,
                        Coordenador: true,
                        Direcao: true,
                        Enc_Educacao: true,
                    }
                }
            }
        });

        // 2. Validação de existência
        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        // 3. O Detetor de Mentiras (validação da hash)
        // Comparamos a string limpa com a hash guardada no campo 'Password' da BD
        const isPasswordValid = await bcrypt.compare(password, user.Password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        // 4. Determinação do Perfil (Role)
        // Começamos com um valor por defeito caso a pessoa não tenha nenhum perfil associado
        let userRole = 'Unknown';

        // Navegamos pelas ligações do Prisma para definir a role correta
        if (user.Pessoa?.Professor) {
            userRole = 'Professor';
        } else if (user.Pessoa?.Coordenador) {
            userRole = 'Coordenador';
        } else if (user.Pessoa?.Direcao) {
            userRole = 'Direcao';
        } else if (user.Pessoa?.Enc_Educacao) {
            userRole = 'Enc_Educacao';
            }

        // 5. Construção do bilhete VIP (Payload do JWT)
        const payload = {
            sub: user.ID_Utilizador,
            username: user.Utilizador,
            role: userRole,
            idPessoa: user.ID_Pessoa
        };

        // Devolvemos o token e a role para o Frontend consumir
        return {
            access_token: await this.jwtService.signAsync(payload),
            role: userRole
        };
    }
}