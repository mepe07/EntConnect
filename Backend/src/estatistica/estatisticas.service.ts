import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta este caminho se a pasta prisma estiver noutro sítio

@Injectable()
export class EstatisticasService {
  constructor(private readonly prisma: PrismaService) {}

  // Função auxiliar para calcular a tendência (percentagem)
  private calcularTendencia(atual: number, passado: number): number {
    if (passado === 0) return atual > 0 ? 100 : 0;
    return ((atual - passado) / passado) * 100;
  }

  async getAlunos() { 
    try {
      const total = await this.prisma.aluno.count();
      return { total, tendencia: 0 };
    } catch (e) {
      return { total: 0, tendencia: 0 };
    }
  }

  async getAulasHoje() {
    try {
      // 1. Definir os dias (Hoje, Amanhã e Ontem)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);

      // 2. Contar Aulas de Hoje
      const totalHoje = await this.prisma.coaching.count({
        where: { Inicio_Coaching: { gte: hoje, lt: amanha } },
      });

      // 3. Contar Aulas de Ontem (Para a tendência)
      const totalOntem = await this.prisma.coaching.count({
        where: { Inicio_Coaching: { gte: ontem, lt: hoje } },
      });

      // 4. Calcular a percentagem real
      let tendencia = 0;
      if (totalOntem === 0) {
        // Se ontem foi 0 e hoje há aulas, subiu 100%. Se hoje for 0 também, mantém a 0%.
        tendencia = totalHoje > 0 ? 100 : 0; 
      } else {
        // Cálculo matemático normal de evolução
        tendencia = ((totalHoje - totalOntem) / totalOntem) * 100;
      }

      return { total: totalHoje, tendencia };
    } catch (e) {
      return { total: 0, tendencia: 0 };
    }
  }

  async getDashboardEncarregado(idUtilizador: number) {
    // 1. Descobrir qual é a Pessoa associada a esta conta
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      select: { ID_Pessoa: true }
    });

    // Se não houver pessoa, devolve tudo a zero
    if (!utilizador || !utilizador.ID_Pessoa) {
      return { pagamentosAtraso: 0, sessoesConfirmar: 0, sessoesMarcadas: 0, totalEducandos: 0 };
    }

    const idPessoa = utilizador.ID_Pessoa;

    // 2. Calcular Pagamentos em Atraso (Soma do ValorEmFalta)
    const faturas = await this.prisma.coaching_Aluno.findMany({
      where: { 
        ID_Enc_Educacao: idPessoa,
        ValorEmFalta: { gt: 0 } // gt: 0 significa "Greater Than 0" (Maior que zero)
      }
    });
    const pagamentosAtraso = faturas.reduce((soma, f) => soma + Number(f.ValorEmFalta), 0);

    // 3. Contar Total de Educandos (Alunos associados a este EE)
    const totalEducandos = await this.prisma.aluno.count({
      where: { ID_Enc_Educacao: idPessoa }
    });

    // 4. Contar Sessões (Marcadas vs Por Confirmar)
    const sessoes = await this.prisma.coaching_Aluno.findMany({
      where: { ID_Enc_Educacao: idPessoa },
      include: { Coaching: true }
    });

    // Ajusta os IDs (6 e 7) para os números corretos da tua tabela "Estado_Coaching"
    // Exemplo: Se "Pendente" for o ID 6 e "Agendado" for o ID 7.
    const sessoesConfirmar = sessoes.filter(s => s.Coaching?.ID_Estado_Coaching === 6).length;
    const sessoesMarcadas = sessoes.filter(s => s.Coaching?.ID_Estado_Coaching === 7).length;

    return {
      pagamentosAtraso,
      sessoesConfirmar,
      sessoesMarcadas,
      totalEducandos
    };
  }

  async getDashboardProfessor(idUtilizador: number, dataInicio: string, dataFim: string) {
    // 1. Encontrar o ID do Professor (Assumindo que o ID_Utilizador liga à tabela Pessoa, e de Pessoa liga a Professor)
    const utilizador = await this.prisma.utilizador.findUnique({
      where: { ID_Utilizador: idUtilizador },
      select: { ID_Pessoa: true }
    });

    if (!utilizador) return { sessoesConcluidas: 0, aulasHojeTotal: 0, aulasHojeDuracao: '0h' };

    // NOTA: Se na tua base de dados a tabela Coaching usa o ID_Pessoa diretamente como ID_Professor,
    // usas utilizador.ID_Pessoa. Se houver uma tabela Professor pelo meio, tens de fazer a pesquisa.
    // Para este exemplo, vou assumir que o ID que está no Coaching bate certo com o ID_Pessoa.
    const idProfessor = utilizador.ID_Pessoa;

    // 2. Calcular Sessões Concluídas no Mês
    // NOTA: Substitui o '8' pelo ID correto do estado "Concluído" na tua tabela Estado_Coaching
    const sessoesConcluidas = await this.prisma.coaching.count({
      where: {
        ID_Professor: idProfessor,
        ID_Estado_Coaching: 8, // <-- Ajustar para o ID do estado Concluído/Realizado
        Inicio_Coaching: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim + 'T23:59:59')
        }
      }
    });

    // 3. Descobrir as Aulas de Hoje
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    
    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);

    const aulasHoje = await this.prisma.coaching.findMany({
      where: {
        ID_Professor: idProfessor,
        Inicio_Coaching: {
          gte: hojeInicio,
          lte: hojeFim
        },
        // Opcional: Podes querer ignorar aulas canceladas aqui (ex: ID_Estado_Coaching: { not: 9 })
      }
    });

    // 4. Calcular Total e Duração (em formato "2h30min")
    const aulasHojeTotal = aulasHoje.length;
    
    // Soma a duração (assumindo que a coluna Duracao está em minutos)
    const minutosTotais = aulasHoje.reduce((soma, aula) => soma + (aula.Duracao || 0), 0);
    
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    
    let aulasHojeDuracao = '0h';
    if (horas > 0 && minutos > 0) aulasHojeDuracao = `${horas}h${minutos}min`;
    else if (horas > 0) aulasHojeDuracao = `${horas}h`;
    else if (minutos > 0) aulasHojeDuracao = `${minutos}min`;

    // 5. Devolver no formato exato que o React está à espera!
    return {
      sessoesConcluidas,
      aulasHojeTotal,
      aulasHojeDuracao
    };
  }
  
}