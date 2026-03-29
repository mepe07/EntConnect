import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaturacaoService {
  constructor(private readonly prisma: PrismaService) {}

  // Representa o '+ getGeneralBilling()' do Coordinator no vosso UML 
  async obterFaturacaoGeral() {
    // 1. O Prisma vai buscar todas as inscrições que não estão pagas
    const faturasPendentes = await this.prisma.coaching_Aluno.findMany({
      where: {
        Pago: false,
        Montante_a_Pagar: { not: null } // Ignora se o preço estiver vazio por algum erro
      },
      include: {
        Coaching: true, // Traz os dados da sessão (datas, etc)
        Aluno: {
          include: {
            Enc_Educacao: {
              include: {
                Pessoa: true, // Precisamos disto para saber o Nome e o Email de quem vai pagar!
              },
            },
          },
        },
      },
    });

    // 2. Criamos um "dicionário" (Map) para organizar as contas por Encarregado
    const mapaFaturacao = new Map();

    for (const item of faturasPendentes) {
      // Regra de segurança: Se por acaso o aluno não tiver encarregado associado, saltamos este registo
      if (!item.Aluno || !item.Aluno.Enc_Educacao) continue;

      const idEE = item.Aluno.Enc_Educacao.ID_Pessoa;
      const pessoaEE = item.Aluno.Enc_Educacao.Pessoa;
      
      // Converte o Decimal da Base de Dados para um Número normal para podermos somar
      const montante = Number(item.Montante_a_Pagar) || 0; 

      // Se este Encarregado de Educação ainda não tem "Ficha de Cliente" no nosso mapa, criamos agora:
      if (!mapaFaturacao.has(idEE)) {
        mapaFaturacao.set(idEE, {
          ID_Enc_Educacao: idEE,
          Nome_Enc_Educacao: pessoaEE.Nome,
          Email_Enc_Educacao: pessoaEE.Email,
          Total_Em_Divida: 0,      // O contador começa a zeros
          Detalhes_Divida: [],     // A lista de sessões que ele deve
        });
      }

      // Vamos buscar a ficha dele ao mapa
      const faturaDoEE = mapaFaturacao.get(idEE);
      
      // Somamos o valor desta sessão específica ao total dele
      faturaDoEE.Total_Em_Divida += montante;

      // Adicionamos o "talão" desta sessão à lista para o vosso Frontend poder mostrar os detalhes
      faturaDoEE.Detalhes_Divida.push({
        ID_Coaching: item.ID_Coaching,
        ID_Aluno: item.ID_Aluno,
        Nome_Aluno: item.Aluno.Nome,
        Montante_Sessao: montante,
        Data_Inscricao: item.Data_Inscricao,
      });
    }

    // 3. O NestJS e a Internet comunicam em Arrays/Listas. Convertemos o nosso Map para Array!
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