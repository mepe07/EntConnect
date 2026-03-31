import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaturacaoService {
  constructor(private readonly prisma: PrismaService) {}

  // Representa o '+ getGeneralBilling()' do Coordinator no vosso UML 
    // Ficheiro: faturacao.service.ts
  
    async obterFaturacaoGeral() {
        // 1. O Prisma vai buscar todas as inscrições não pagas, mas agora com "raio-X" profundo!
        const faturasPendentes = await this.prisma.coaching_Aluno.findMany({
            where: {
                Pago: false,
                Montante_a_Pagar: { not: null } 
            },
            include: {
                // A MAGIA ACONTECE AQUI: Vamos buscar a sessão e quem a deu!
                Coaching: { 
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true // Essencial para obtermos o Nome do Professor!
                            }
                        }
                    }
                }, 
                Aluno: {
                    include: {
                        Enc_Educacao: {
                            include: {
                                Pessoa: true, // Para sabermos a quem cobrar a dívida
                            },
                        },
                    },
                },
            },
        });

        const mapaFaturacao = new Map();

        for (const item of faturasPendentes) {
            if (!item.Aluno || !item.Aluno.Enc_Educacao) continue;

            const idEE = item.Aluno.Enc_Educacao.ID_Pessoa;
            const pessoaEE = item.Aluno.Enc_Educacao.Pessoa;
      
            const montante = Number(item.Montante_a_Pagar) || 0; 

            // Criar a "Ficha de Cliente" se ainda não existir no mapa
            if (!mapaFaturacao.has(idEE)) {
                mapaFaturacao.set(idEE, {
                    ID_Enc_Educacao: idEE,
                    Nome_Enc_Educacao: pessoaEE.Nome,
                    Email_Enc_Educacao: pessoaEE.Email,
                    Contato_Enc_Educacao: pessoaEE.Contacto, // Dica: Útil para a coordenadora ligar logo!
                    Total_Em_Divida: 0,      
                    Detalhes_Divida: [],     
                });
            }

            const faturaDoEE = mapaFaturacao.get(idEE);
            faturaDoEE.Total_Em_Divida += montante;

            // O RELATÓRIO: Injetamos todos os dados ricos que pediste para o Frontend
            faturaDoEE.Detalhes_Divida.push({
                ID_Coaching: item.ID_Coaching,
                Nome_Aluno: item.Aluno.Nome,
                Montante_Sessao: montante,
                // Usamos o operador '?' (Optional Chaining) para evitar erros caso a sessão não tenha prof atribuído
                Nome_Professor: item.Coaching.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                Data_Sessao: item.Coaching.Inicio_Coaching, 
                Data_Inscricao: item.Data_Inscricao,
            });
        }

        return Array.from(mapaFaturacao.values());
    }

  // Representa o '+ getBilling()' do LegalGuardian
  async obterFaturacaoPorEncarregado(idEncarregado: number) {
    // Aqui vais à base de dados buscar apenas as dívidas/faturas de 1 pessoa
  }

  // Representa o '+ paymentRegister()' do Invoice
  async registarPagamento(idCoaching: number, idAluno: number) {
    // Aqui vais à tabela Coaching_Aluno e mudas o 'Pago' para 'true'
  }
}