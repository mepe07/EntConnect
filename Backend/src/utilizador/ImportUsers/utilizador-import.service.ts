import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlobServiceClient } from '@azure/storage-blob';

@Injectable()
export class UtilizadorImportService {
  private blobServiceClient?: BlobServiceClient; //ponto de interrogação variável é opcional
  private containerName: string;

  constructor(private readonly prisma: PrismaService) {
    // Inicializa a ligação ao Azure quando o serviço arranca
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || '';

    // Segurança: Avisa se as chaves não estiverem no .env, mas não crasha a app
    if (!connectionString || !this.containerName) {
      console.warn('⚠️ AVISO: As chaves do Azure Blob Storage não estão configuradas no .env!');
    } else {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  // NOVA FUNÇÃO: Prepara a lista de ficheiros para o teu futuro Frontend!
  async listarFicheirosNoBlob() {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    const ficheiros: string[] = []; //string[] array vai ser uma lista de textos
    for await (const blob of containerClient.listBlobsFlat()) {
      ficheiros.push(blob.name);
    }
    return ficheiros;
  }

  // Lê do Azure e importa
  async importarDeBlob(nomeFicheiro: string) {
    // Impede o código de avançar se o Azure não estiver ligado
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      // 1. Descarrega o ficheiro do Azure diretamente para a memória (Buffer)
      const buffer = await blockBlobClient.downloadToBuffer();
      
      // 2. Converte para texto
      const conteudo = buffer.toString('utf-8');

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
              Password: 'password_GeradaBackEnd', // Futuramente: bcrypt.hashSync(...)
              Ativo: true
            }
          });

          resultados.push({ pessoa: novaPessoa, utilizador: novoUtilizador });
          console.log(`✅ Sucesso: ${nome} importado do Azure Blob!`);

        } catch (erro: any) {
           console.error(`❌ Erro ao importar ${nome}:`, erro.message || erro);
        }
      }

      return {
        mensagem: `Importação do Azure concluída. ${resultados.length} registos criados.`,
        dados: resultados
      };

    } catch (error) {
      console.error("Erro ao comunicar com o Azure Blob Storage:", error);
      throw new BadRequestException(`Não foi possível ler o ficheiro "${nomeFicheiro}" do Azure. Confirme se o nome está correto e se o ficheiro existe no container.`);
    }
  }
}