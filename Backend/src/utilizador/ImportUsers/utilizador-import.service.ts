import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlobsService } from '../../Infraestrutura/Blobs/blobs.service';

@Injectable()
/**
 * Serviço responsável por importar utilizadores a partir de ficheiros CSV em Azure Blob.
 */
export class UtilizadorImportService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly blobsService: BlobsService
  ) {}

  /**
   * Importa utilizadores a partir de um ficheiro existente no blob storage.
   *
   * @param nomeFicheiro - Nome do ficheiro CSV armazenado no blob.
   * @returns Resumo da importação efetuada.
   */
  async importarDeBlob(nomeFicheiro: string) {
    const conteudo = await this.blobsService.lerFicheiroTexto('importar-csv', nomeFicheiro);

    const linhas = conteudo.split(/\r?\n/);
    const cabecalho = linhas[0].trim();
    const delimitador = cabecalho.includes(';') ? ';' : ',';
    const dados = linhas.slice(1).filter(linha => linha.trim().length > 0);

    const resultados: { pessoa: any; utilizador: any }[] = [];

    for (const linha of dados) {
      const colunas = linha.split(delimitador);

      const nome = colunas[0]?.replace(/"/g, '').trim();
      const email = colunas[1]?.replace(/"/g, '').trim();
      const nif = colunas[2]?.replace(/"/g, '').trim();
      const contacto = colunas[3]?.replace(/"/g, '').trim();
      const dataNascimentoStr = colunas[4]?.replace(/"/g, '').trim();

      try {
        const novaPessoa = await this.prisma.pessoa.create({
          data: {
            Nome: nome,
            Email: email,
            NIF: nif,
            Contacto: contacto,
            Data_Nascimento: new Date(dataNascimentoStr + 'T00:00:00Z'), 
          }
        });

        const novoUtilizador = await this.prisma.utilizador.create({
          data: {
            ID_Pessoa: novaPessoa.ID_Pessoa,
            Utilizador: email,
            Password: 'password_GeradaBackEnd', 
            Ativo: true
          }
        });

        resultados.push({ pessoa: novaPessoa, utilizador: novoUtilizador });
        console.log(`Sucesso: ${nome} importado do Azure Blob!`);

      } catch (erro: any) {
         console.error(`Erro ao importar ${nome}:`, erro.message || erro);
      }
    }

    return {
      mensagem: `Importação do Azure concluída. ${resultados.length} registos criados.`,
      dados: resultados
    };
  }
}
