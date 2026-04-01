import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';

@Injectable()
export class BlobsService {
  private blobServiceClient?: BlobServiceClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || '';

    if (!connectionString || !this.containerName) {
      console.warn('⚠️ AVISO: As chaves do Azure Blob Storage não estão configuradas no .env!');
    } else {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  // Lista os ficheiros (para o teu futuro Frontend)
  async listarFicheiros(): Promise<string[]> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const ficheiros: string[] = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      ficheiros.push(blob.name);
    }
    return ficheiros;
  }

  // Descarrega o ficheiro e devolve logo como texto (String)
  async lerFicheiroTexto(nomeFicheiro: string): Promise<string> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      const buffer = await blockBlobClient.downloadToBuffer();
      return buffer.toString('latin1'); // tratar caracteres especiais (ex: acentos, ç, ^)
      
    } catch (error) {
      console.error("Erro ao comunicar com o Azure Blob Storage:", error);
      throw new BadRequestException(`Não foi possível ler o ficheiro "${nomeFicheiro}". Confirme se o nome está correto no Azure.`);
    }
  }
}