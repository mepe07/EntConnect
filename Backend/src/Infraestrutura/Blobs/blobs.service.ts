import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import 'multer'; //evitar download do multer, Finalidade: Utilizar o Express.Multer.File (Carregar filheiros locais)

@Injectable()
export class BlobsService {
  private blobServiceClient?: BlobServiceClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      console.warn('Azure Connection String não encontrada!');
    } else {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }
  

  /**
   * Faz o upload de um ficheiro para o Azure Blob Storage.
   * @param file O ficheiro vindo do Multer (@UploadedFile)
   * @param pasta O caminho/pasta dentro do container (ex: 'fotos-pessoas')
   * @returns O URL público do ficheiro carregado com o nome do ficheiro adaptado Ex: user{id}
   */
  // Agora pede-se o nome do container como primeiro parâmetro
  async uploadFicheiro(
    containerName: string, 
    file: Express.Multer.File, 
    nomePersonalizado: string
  ): Promise<string> {
    
    if (!this.blobServiceClient) throw new InternalServerErrorException('Azure não configurado.');

    try {
      // Usa o containerName que passamos na função
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      const extensao = file.originalname.split('.').pop();
      const caminhoNoBlob = `${nomePersonalizado}.${extensao}`;
      
      const blockBlobClient = containerClient.getBlockBlobClient(caminhoNoBlob);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype }
      });

      return blockBlobClient.url;
    } catch (error) {
      throw new BadRequestException(`Erro ao carregar para o contentor ${containerName}`);
    }
  }

  // Lista os ficheiros de um determinado contentor (para o teu futuro Frontend)
  async listarFicheiros(containerName: string): Promise<string[]> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    // Agora usa o nome do contentor que passas na chamada da função
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const ficheiros: string[] = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      ficheiros.push(blob.name);
    }
    return ficheiros;
  }

  // Descarrega o ficheiro de um contentor e devolve logo como texto (String)
  async lerFicheiroTexto(containerName: string, nomeFicheiro: string): Promise<string> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      // Agora usa o nome do contentor que passas na chamada da função
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      const buffer = await blockBlobClient.downloadToBuffer();
      return buffer.toString('latin1'); // tratar caracteres especiais
      
    } catch (error) {
      console.error("Erro ao comunicar com o Azure Blob Storage:", error);
      throw new BadRequestException(`Não foi possível ler o ficheiro "${nomeFicheiro}" no contentor "${containerName}". Confirma se os nomes estão corretos no Azure.`);
    }
  }
}