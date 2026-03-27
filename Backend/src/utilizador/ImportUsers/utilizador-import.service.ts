import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import 'multer'; // evitar download do multer

@Injectable()
export class UtilizadorImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importarDeCSV(ficheiro: Express.Multer.File) {
    const conteudo = ficheiro.buffer.toString('utf-8');

    // 1. Partir o texto em linhas (o regex /\r?\n/ garante que funciona em Windows e Mac)
    const linhas = conteudo.split(/\r?\n/);

    // 2. Descobrir o delimitador na primeira linha (cabeçalho)
    const cabecalho = linhas[0].trim();
    const delimitador = cabecalho.includes(';') ? ';' : ',';

    // 3. Filtrar linhas vazias e remover o cabeçalho
    const dados = linhas.slice(1).filter(linha => linha.trim().length > 0);

    const resultados: { pessoa: any; utilizador: any }[] = [];

    // 4. Percorrer cada linha de dados
    for (const linha of dados) {
      // Dividir a linha pelas colunas usando o delimitador detetado
      const colunas = linha.split(delimitador);

      // Mapear para as variáveis e limpar espaços e as malditas ASPAS (") do Excel 
      // Nota: O .replace(/"/g, '') procura todas as aspas duplas na palavra e apaga-as.
      const nome = colunas[0]?.replace(/"/g, '').trim();
      const email = colunas[1]?.replace(/"/g, '').trim();
      const nif = colunas[2]?.replace(/"/g, '').trim();
      const contacto = colunas[3]?.replace(/"/g, '').trim();
      const dataNascimentoStr = colunas[4]?.replace(/"/g, '').trim();

      try {
        // 1. Cria a Pessoa
        const novaPessoa = await this.prisma.pessoa.create({
          data: {
            Nome: nome,
            Email: email,
            NIF: nif,
            Contacto: contacto,
            // Adicionamos 'T00:00:00Z' para garantir que o Prisma não dá "Invalid Date"
            Data_Nascimento: new Date(dataNascimentoStr + 'T00:00:00Z'), 
          }
        });

        // 2. Cria o Utilizador associado a essa Pessoa
        const novoUtilizador = await this.prisma.utilizador.create({
          data: {
            ID_Pessoa: novaPessoa.ID_Pessoa,
            Utilizador: email,
            Password: 'password_padrao_123', // Podes mudar ou gerar uma aleatória depois
            Ativo: true
          }
        });

        resultados.push({ pessoa: novaPessoa, utilizador: novoUtilizador });
        console.log(`✅ Sucesso: ${nome} importado com o NIF ${nif}!`);

      } catch (erro: any) {
         // O erro.message mostra exatamente se falhou por NIF repetido ou outro motivo
         console.error(`❌ Erro ao importar ${nome}:`, erro.message || erro);
      }
    }

    return {
      mensagem: `Importação concluída. ${resultados.length} registos criados.`,
      dados: resultados
    };
  }
}