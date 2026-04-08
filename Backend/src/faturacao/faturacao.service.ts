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

    /* Relatório de Faturação Geral:
    * Este método é o "coração" do módulo de faturação. Ele busca todas as sessões de coaching dentro do intervalo de datas especificado,
    * trazendo informações detalhadas sobre cada sessão, incluindo o estado atual da aula
    */
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

    /* Relatório de Histórico de Coaching: 
    * Este método vai buscar todas as sessões de coaching dentro do intervalo de datas especificado, 
    * trazendo informações detalhadas sobre cada sessão, incluindo o estado atual da aula
    */
    async getHistoricoCoaching(dataInicio: Date, dataFim: Date) {

        const aulasBD = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: dataInicio, // gte = Greater Than or Equal (Maior ou Igual)
                        lte: dataFim, // lte = Less Than or Equal (Menor ou Igual)
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

    /* Relatório de Dashboard Financeiro:
    * Este método é o "coração" do módulo de faturação. Ele busca todas as sessões de coaching dentro do intervalo de datas especificado,
    * trazendo informações detalhadas sobre cada sessão, incluindo o estado atual da aula
    */
    async getDashboardFinanceiro(inicio: Date, fim: Date) {
        const faturas = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: {
                        gte: inicio, 
                        lte: fim, 
                    }
                }
            },
            include: {
                Coaching: {
                    include: {
                        Professor: { include: { Pessoa: true } } 
                    }
                }
            },
            orderBy: {
                Coaching: { Inicio_Coaching: 'asc' }
            }
        });

        let totalPago = 0;
        let totalEmDivida = 0;
        const rankingProfessores: Record<string, number> = {};

        // ==========================================
        // A MAGIA DO PREENCHIMENTO DE ZEROS
        // ==========================================
        const evolucaoDiaria: Record<string, number> = {};
        
        // Criamos um clone da data de início para ir saltando dia a dia
        const diaAtual = new Date(inicio);
        
        // Loop: Enquanto o 'diaAtual' for menor ou igual ao 'fim'
        while (diaAtual <= fim) {
            // Extrai a data limpa (ex: '2026-03-07')
            const dataSimples = diaAtual.toISOString().split('T')[0];
            
            // Força a criação da gaveta com 0€, mesmo que não haja aulas!
            evolucaoDiaria[dataSimples] = 0; 
            
            // Avança o relógio 24 horas (1 dia para a frente)
            diaAtual.setDate(diaAtual.getDate() + 1);
        }
        // ==========================================

        faturas.forEach(fatura => {
            const valor = fatura.Montante_a_Pagar ? Number(fatura.Montante_a_Pagar) : 0;

            // --- Gráfico 1: Donut de Pagos vs Em Dívida ---
            if (fatura.Pago) {
                totalPago += valor;
            } else {
                totalEmDivida += valor;
            }

            // --- Gráfico 2: Evolução no Tempo ---
            if (fatura.Pago && fatura.Coaching?.Inicio_Coaching) {
                const dataSimples = new Date(fatura.Coaching.Inicio_Coaching).toISOString().split('T')[0]; 
                
                // Como já criámos todas as gavetas a zeros, agora é só SOMAR o valor da fatura!
                if (evolucaoDiaria[dataSimples] !== undefined) {
                    evolucaoDiaria[dataSimples] += valor;
                }
            }

            // --- Gráfico 3: O Pódio de Professores ---
            if (fatura.Pago && fatura.Coaching.Professor?.Pessoa?.Nome) {
                const nomeProf = fatura.Coaching.Professor.Pessoa.Nome;
                if (!rankingProfessores[nomeProf]) rankingProfessores[nomeProf] = 0;
                rankingProfessores[nomeProf] += valor;
            }
        });
        
        // Converte o objeto de datas num Array limpo
        const arrayEvolucao = Object.keys(evolucaoDiaria).map(data => ({
            data: data,
            faturado: evolucaoDiaria[data]
        }));

        const arrayTopProfessores = Object.keys(rankingProfessores)
            .map(nome => ({ nome: nome, total: rankingProfessores[nome] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); 

        return {
            resumoGeral: { totalPago: totalPago, totalEmDivida: totalEmDivida },
            evolucaoFinanceira: arrayEvolucao,
            topProfessores: arrayTopProfessores
        };
    }

    /**
     * Calcula a previsão de receita para os próximos 3 meses.
     * Implementa 'Zero-Filling' para garantir que meses sem faturação agendada
     * são devolvidos com valor 0, mantendo a integridade visual do gráfico.
     * * @returns {Promise<Array<{mes: string, previsto: number}>>} Array formatado para o Recharts
     */
    async getPrevisaoFinanceira() {
        const hoje = new Date();
        
        const daquiA3Meses = new Date();
        daquiA3Meses.setMonth(hoje.getMonth() + 3);

        // ==========================================
        // 1. A MAGIA DO PREENCHIMENTO DE ZEROS (Futuro)
        // ==========================================
        const previsaoMensal: Record<string, number> = {};

        // Criamos antecipadamente as "gavetas" para o mês atual e os próximos 2
        for (let i = 0; i < 3; i++) {
            const mesAlvo = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const nomeMes = mesAlvo.toLocaleString('pt-PT', { month: 'long' });
            // Capitalizar a primeira letra (ex: "abril" -> "Abril")
            const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
            const labelMesAno = `${mesFormatado} ${mesAlvo.getFullYear()}`;
            
            // Forçamos o mês a existir com 0€
            previsaoMensal[labelMesAno] = 0; 
        }

        // ==========================================
        // 2. EXTRAÇÃO E PROCESSAMENTO
        // ==========================================
        const aulasFuturas = await this.prisma.coaching_Aluno.findMany({
            where: {
                Coaching: {
                    Inicio_Coaching: { gte: hoje, lte: daquiA3Meses }
                }
            },
            include: { Coaching: true },
            orderBy: { Coaching: { Inicio_Coaching: 'asc' } }
        });

        aulasFuturas.forEach(fatura => {
            const valor = fatura.Montante_a_Pagar ? Number(fatura.Montante_a_Pagar) : 0;
            
            if (fatura.Coaching?.Inicio_Coaching) {
                const data = new Date(fatura.Coaching.Inicio_Coaching);
                const nomeMes = data.toLocaleString('pt-PT', { month: 'long' });
                const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
                const labelMesAno = `${mesFormatado} ${data.getFullYear()}`;
                
                // Soma o valor à gaveta que já foi criada no passo 1
                if (previsaoMensal[labelMesAno] !== undefined) {
                    previsaoMensal[labelMesAno] += valor;
                }
            }
        });

        // 3. RETORNO (Mapeamento final)
        return Object.keys(previsaoMensal).map(mes => ({
            mes: mes,
            previsto: previsaoMensal[mes]
        }));
    }

    async obterFaturacaoPorEncarregado(idEncarregado: number) {
        // TODO: Lógica para ir buscar a faturação de 1 só encarregado
        return [];
    }

    async registarPagamento(idCoaching: number, idAluno: number) {
        // TODO: Lógica para o botão "Pendente" da Faturação
        return { message: "Em construção..." };
    }

}