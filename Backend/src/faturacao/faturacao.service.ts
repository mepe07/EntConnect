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

    async obterRelatorioFaturacaoGeral(dataInicio: Date, dataFim: Date) {
        // 1. A Query com os saltos (includes) que estudámos
        const inscricoes = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: dataInicio,
                        lte: dataFim,
                    },
                },
            },
            include: {
                Aluno: true,
                Coaching: {
                    include: {
                        Professor: { include: { Pessoa: true } },
                        Sala: true,
                    },
                },
            },
        });

        // 2. Mapeamento para o DTO limpo que o React espera
        return inscricoes.map((item) => {
            return {
                idCoaching: item.ID_Coaching,
                dataAula: item.Coaching.Inicio_Coaching,
                nomeProfessor: item.Coaching.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                fotoProfessorUrl: item.Coaching.Professor?.Pessoa?.Foto || null,
                nomeAluno: item.Aluno.Nome,
                // Garantimos que o valor é um número para não dar erro no Frontend
                valorTotal: Number(item.Montante_a_Pagar) || 0,
                estaPago: item.Pago,
                duracaoMinutos: item.Coaching.Duracao,
                salaNome: item.Coaching.Sala?.Nome || 'Sem sala',
            };
        });
    }

    async getHistoricoCoaching(dataInicio: Date, dataFim: Date) {

        const aulasBD = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: dataInicio,
                        lte: dataFim,
                    }
                }
            },
            include: {
                Aluno: true, // Puxa o Aluno
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true // Puxa o nome do Professor
                            }
                        },
                        Sala: true, // Puxa o Estúdio
                        Estado_Coaching: true // Puxa o estado da aula
                    }
                }
            },
            orderBy: {
                Coaching: {
                    Inicio_Coaching: 'asc'
                }
            }
        });

        // 3. Mapear os dados para o Frontend
        return aulasBD.map(registo => {
            // Prevenção de erros caso falte a data
            const dataCrua = registo.Coaching?.Inicio_Coaching;
            const dataDaAula = dataCrua ? new Date(dataCrua) : new Date();
            
            // Lógica Atualizada: Vamos ler o 'Tipo' diretamente da tabela Estado_Coaching.
            // O uso do '?.' (Optional Chaining) garante que o código não rebenta se por acaso
            // uma aula estiver sem estado associado (ID_Estado_Coaching for NULL).
            const estadoRealDaDB = registo.Coaching?.Estado_Coaching?.Tipo || 'Sem Estado';

            return {
                idCoaching: registo.ID_Coaching,
                idAluno: registo.ID_Aluno,
                nomeAluno: registo.Aluno?.Nome || 'Aluno Desconhecido',
                nomeProfessor: registo.Coaching?.Professor?.Pessoa?.Nome || 'Professor Desconhecido',
                nomeSala: registo.Coaching?.Sala?.Nome || 'Sem Sala',
                dataAula: dataDaAula.toISOString(),
                duracaoMinutos: registo.Coaching?.Duracao || 0,
                // Passamos o estado verdadeiro para o ecrã
                estadoAula: estadoRealDaDB 
            };
        });
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