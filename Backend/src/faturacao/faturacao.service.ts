
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FaturacaoService {
    constructor(private readonly prisma: PrismaService) { }

    // Representa o '+ getGeneralBilling()' do Coordinator no vosso UML 
    // Ficheiro: faturacao.service.ts

    async obterFaturacaoGeral() {
        // 1. O Prisma vai buscar todas as inscrições não pagas, mas agora com "raio-X" profundo!
        const faturasPendentes = await this.prisma.coaching_Aluno.findMany({
            where: {
                ValorEmFalta: { gt: 0 }
            },
            include: {
                // A MAGIA ACONTECE AQUI: Vamos buscar a sessão e quem a deu!
                Coaching: {
                    include: {
                        Professor: {
                            include: {
                                Pessoa: true // Essencial para obtermos o Nome do Professor!
                            }
                        },
                        Sala: true, // Para sabermos onde foi a aula    
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

            const montante = Number(item.ValorEmFalta) || 0;

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

            // 5. Mapeamento para o DTO (Isto é o que o Frontend espera)
            return faturasPendentes.map((item) => {
                return {
                    idCoaching: item.ID_Coaching,
                    dataAula: item.Coaching.Inicio_Coaching,
                    nomeProfessor: item.Coaching.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                    fotoProfessorUrl: item.Coaching.Professor?.Pessoa?.Foto || null,
                    nomeAluno: item.Aluno.Nome,
                    // Usamos o campo correto que descobrimos no teu Prisma
                    valorTotal: Number(item.ValorEmFalta) || 0,
                    // Como não tens o campo 'Pago', usamos a lógica do ValorEmFalta ser 0
                    estaPago: Number(item.ValorEmFalta) === 0,
                    duracaoMinutos: item.Coaching.Duracao,
                    salaNome: item.Coaching.Sala?.Nome || 'Sem sala',
                };
            });
        }
    }
    /* Relatório de Faturação Geral:
    * Este método é o "coração" do módulo de faturação. Ele busca todas as sessões de coaching dentro do intervalo de datas especificado,
    * trazendo informações detalhadas sobre cada sessão, incluindo o estado atual da aula
    */
    async obterRelatorioFaturacaoGeral(dataInicio: Date, dataFim: Date, role: string, userId: number) {

        // 1. Criamos o filtro específico para o Coaching usando o Molde do Prisma!
        // Adeus 'any', olá TypeScript auto-complete.
        const filtroCoaching: Prisma.CoachingWhereInput = {
            Inicio_Coaching: {
                gte: dataInicio,
                lte: dataFim,
            },
        };

        // 2. A MAGIA DO TÚNEL (RBAC) - Totalmente Tipado!
        // Se for um Professor, adicionamos a restrição ao filtro do Coaching.
        if (role === 'Professor') {
            filtroCoaching.Professor = {
                Pessoa: {
                    Utilizador: {
                        // Adeus 'some'! A relação é 1-para-1, vamos diretos ao assunto:
                        ID_Utilizador: userId
                    }
                }
            };
        }

        // 3. Criamos o filtro final que vai entrar no findMany
        const condicoesFiltro: Prisma.Coaching_AlunoWhereInput = {
            Coaching: filtroCoaching,
        };

        // 4. A Query final ao Prisma (Sem erros de linter e super segura)
        const inscricoes = await this.prisma.coaching_Aluno.findMany({
            where: condicoesFiltro,
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

        // 5. Mapeamento para o DTO (Isto mantém-se intacto)
        return inscricoes.map((item) => {
            return {
                idCoaching: item.ID_Coaching,
                dataAula: item.Coaching.Inicio_Coaching,
                nomeProfessor: item.Coaching.Professor?.Pessoa?.Nome || 'Professor não atribuído',
                fotoProfessorUrl: item.Coaching.Professor?.Pessoa?.Foto || null,
                nomeAluno: item.Aluno.Nome,
                valorTotal: Number(item.ValorEmFalta) || 0,
                isPago: item.ValorEmFalta ? Number(item.ValorEmFalta) === 0 : true,
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

        let total = 0;
        let totalEmDivida = 0;
        const rankingProfessores: Record<string, number> = {};

        // ==========================================
        // A MAGIA DO PREENCHIMENTO DE ZEROS
        // ==========================================
        const evolucaoDiaria: Record<string, number> = {};

        // No início do método Dashboard
        const diaAtual = new Date(inicio); // Garante que 'inicio' é um objeto Date
        const dataFim = new Date(fim);

        while (diaAtual <= dataFim) {
            const dataSimples = diaAtual.toISOString().split('T')[0];
            evolucaoDiaria[dataSimples] = 0;
            diaAtual.setDate(diaAtual.getDate() + 1);
        }

        let totalPago = 0;

        faturas.forEach(fatura => {
            const valor = fatura.ValorEmFalta ? Number(fatura.ValorEmFalta) : 0;

            // Criamos esta variável aqui para ser usada nos 3 gráficos abaixo
            const isPago = valor === 0;

            // --- Gráfico 1: Donut de Pagos vs Em Dívida ---
            if (isPago) {
                totalPago += valor; // Nota: Se valor é 0, podes precisar de outro campo para o total pago
            } else {
                totalEmDivida += valor;
            }

            // --- Gráfico 2: Evolução no Tempo ---
            // --- Gráfico 2: Evolução no Tempo ---
            const dataSessao = fatura.Coaching?.Inicio_Coaching;

            if (isPago && dataSessao instanceof Date) {
                const dataSimples = dataSessao.toISOString().split('T')[0];

                if (evolucaoDiaria[dataSimples] !== undefined) {
                    evolucaoDiaria[dataSimples] += valor;
                }
            }

            // --- Gráfico 3: O Pódio de Professores ---
            if (isPago && fatura.Coaching?.Professor?.Pessoa?.Nome) {
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
            resumoGeral: { totalPago, totalEmDivida },
            evolucaoFinanceira: arrayEvolucao,
            topProfessores: arrayTopProfessores,
        };
    } // Este fecho (linha 310) termina o método getDashboardFinanceiro



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
            const valor = fatura.ValorEmFalta ? Number(fatura.ValorEmFalta) : 0;

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